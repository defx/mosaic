import { write, writeClasses, writeText } from "./xo.js"
import type { StateStore } from "./store.js"
import type { ActionHandlers, EventContext, MosaicConfig } from "./types.js"

export function initialise<
  State extends object,
  Actions extends ActionHandlers<State>,
>(
  rootNode: Element,
  config: MosaicConfig<State, Actions>,
  store: StateStore<State, Actions>,
) {
  const { controller } = store
  let state = config.state ?? ({} as State)
  const elements = (config.elements ?? []).map((binding) => ({
    ...binding,
    targets: [...rootNode.querySelectorAll(binding.select)],
  }))

  function listen(target: Element, type: string, callback: EventListener) {
    target.addEventListener(type, callback)
    store.own(() => target.removeEventListener(type, callback))
  }

  function complete(result: void | Promise<void>) {
    if (!result) return
    void result.catch((error: unknown) => {
      if (store.isDestroyed() && error instanceof DOMException && error.name === "AbortError") return
      reportError(error)
    })
  }

  const initialisedKeys = new Map<string, SyncControl["kind"]>()
  const controls = new WeakMap<Element, SyncControl>()
  const composing = new WeakSet<Element>()

  // Register sync first so consumer input/change handlers see the current state.
  for (const binding of elements) {
    const { sync } = binding
    if (sync === undefined) continue
    for (const target of binding.targets) {
      const control = syncControl(target)
      controls.set(target, control)
      const kind = initialisedKeys.get(sync)
      if (kind !== undefined && kind !== control.kind) {
        throw new TypeError(`sync key "${sync}" cannot mix checkbox and string controls`)
      }
      if (kind === undefined) {
        state = { ...state, [sync]: control.read() }
        initialisedKeys.set(sync, control.kind)
      }
      const update = () => {
        const value = control.read()
        if (controller.getState()[sync] !== value) {
          store.patch({ [sync]: value } as Partial<State>)
        }
      }
      if (control.kind === "boolean") {
        listen(target, "input", update)
        listen(target, "change", update)
      } else {
        listen(target, "compositionstart", () => { composing.add(target) })
        listen(target, "input", (event) => {
          if ((event as InputEvent).isComposing) composing.add(target)
          update()
        })
        listen(target, "compositionend", () => {
          composing.delete(target)
          update()
        })
      }
    }
  }

  for (const binding of elements) {
    binding.targets.forEach((element, index) => {
      for (const [type, callback] of Object.entries(binding.on ?? {})) {
        if (!callback) continue
        listen(element, type, (event) => {
          if (store.isDestroyed()) return
          const context: EventContext<State, Actions> = {
            state: controller.getState(), element, index, event,
            dispatch: controller.dispatch, getState: controller.getState,
          }
          if (typeof callback === "string") {
            const dispatch = controller.dispatch as unknown as (
              name: string, payload: EventContext<State, Actions>,
            ) => Promise<void>
            complete(dispatch(callback, context))
          } else {
            // Each event name retains its specific event type in the public configuration.
            const handler = callback as (context: EventContext<State, Actions>) => void | Promise<void>
            complete(handler(context))
          }
        })
      }
    })
  }

  store.initialise(state, (state) => {
    for (const { targets, attribute, text, class: classes, sync } of elements) {
      for (const [index, target] of targets.entries()) {
        if (store.isDestroyed()) return
        if (attribute) {
          const attributes = attribute({ state, element: target, index })
          if (store.isDestroyed()) return
          write(target, attributes)
        }
        if (text) {
          const value = text({ state, element: target, index })
          if (store.isDestroyed()) return
          writeText(target, value)
        }
        if (classes) {
          const value = classes({ state, element: target, index })
          if (store.isDestroyed()) return
          writeClasses(target, value)
        }
        if (sync !== undefined && !composing.has(target)) {
          controls.get(target)!.write(state[sync] as string | boolean)
        }
      }
    }
  })
}

interface SyncControl {
  kind: "string" | "boolean"
  read(): string | boolean
  write(value: string | boolean): void
}

function syncControl(target: Element): SyncControl {
  const name = target.localName
  const input = target as HTMLInputElement
  if (target.namespaceURI === "http://www.w3.org/1999/xhtml") {
    if (name === "input" && input.type === "checkbox") {
      return {
        kind: "boolean",
        read: () => input.checked,
        write: (value) => {
          if (input.checked !== value) input.checked = value as boolean
        },
      }
    }
    if (name === "textarea" ||
      (name === "select" && !(target as HTMLSelectElement).multiple) ||
      (name === "input" && !["radio", "file"].includes(input.type))) {
      const control = target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      return {
        kind: "string",
        read: () => control.value,
        write: (value) => {
          if (control.value !== value) control.value = value as string
        },
      }
    }
  }
  throw new TypeError("sync requires a checkbox, string-valued input, textarea, or single-select control")
}
