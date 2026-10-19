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

  const initialisedKeys = new Set<string>()
  const composing = new WeakSet<Element>()

  // Register sync first so consumer input handlers see the current state.
  for (const binding of elements) {
    const { sync } = binding
    if (sync === undefined) continue
    for (const target of binding.targets) {
      const input = syncControl(target)
      if (!initialisedKeys.has(sync)) {
        state = { ...state, [sync]: input.value }
        initialisedKeys.add(sync)
      }
      const update = () => {
        if (store.controller.getState()[sync] !== input.value) {
          store.patch({ [sync]: input.value } as Partial<State>)
        }
      }
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
          const input = target as ValueControl
          const value = state[sync] as string
          if (input.value !== value) input.value = value
        }
      }
    }
  })
}

type ValueControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

function syncControl(target: Element): ValueControl {
  const name = target.localName
  const control = target as ValueControl
  const supported = target.namespaceURI === "http://www.w3.org/1999/xhtml" && (
    name === "textarea" ||
    (name === "select" && !(control as HTMLSelectElement).multiple) ||
    (name === "input" && !["checkbox", "radio", "file"].includes((control as HTMLInputElement).type))
  )
  if (!supported) throw new TypeError("sync requires a string-valued input, textarea, or single-select control")
  return control
}
