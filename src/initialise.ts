import { write } from "./xo.js"
import type {
  ActionHandlers,
  Controller,
  ElementConfig,
  MosaicConfig,
} from "./types.js"

const matchGlobalSelector = (q: string) => q.match(/^:global\(([^)].+)\)$/)?.[1]

type BoundElement<State extends object, Actions> = {
  select: string
  scope: "global" | "local"
  getNodes: () => (Element | null)[]
} & Pick<ElementConfig<State, Actions>, "attribute" | "sync" | "on">

type RuntimeHandler<State extends object, Actions> = (
  event: Event,
  store: Controller<State, Actions>,
  index: number,
) => void | Promise<void>

export function initialise<
  State extends object,
  Actions extends ActionHandlers<State>,
>(
  rootNode: Element,
  config: MosaicConfig<State, Actions>,
  store: Controller<State, Actions>,
) {
  let state = config.state ?? ({} as State)
  const elements: BoundElement<State, Actions>[] = (config.elements || []).map((v) => {
    let select = (v.select || v.selectAll)!
    const globalSelector = matchGlobalSelector(select)
    select = globalSelector || select
    return {
      ...v,
      select,
      getNodes: () => {
        const contextNode = globalSelector ? document.body : rootNode
        if (v.select) {
          return v.select === ":self"
            ? [rootNode]
            : [contextNode.querySelector(select)]
        } else {
          return [...contextNode.querySelectorAll(select)]
        }
      },
      scope: globalSelector ? "global" : "local",
    }
  })
  const event: Record<
    string,
    (BoundElement<State, Actions> & {
      callback: string | RuntimeHandler<State, Actions>
    })[]
  > = {}

  // derive initial state from input directives...
  elements
    .filter(({ sync }) => sync)
    .forEach((c) => {
      const { getNodes } = c
      const sync = c.sync!
      const targets = getNodes()
      targets.forEach((target) => {
        state = { ...state, [sync]: (target as HTMLInputElement).value }

        event["local:input"] = event["local:input"] || []
        event["local:input"].push({
          ...c,
          callback: (event) => {
            const { target } = event
            store.merge({
              [sync]: (target as HTMLInputElement).value,
            } as Partial<State>)
          },
        })
      })
    })

  // find event listeners
  elements
    .filter(({ on }) => on)
    .forEach((c) => {
      const { scope } = c
      const on = c.on!

      const entries = Object.entries(on) as [
        string,
        string | RuntimeHandler<State, Actions>,
      ][]
      entries.forEach(([type, callback]) => {
        const k = `${scope}:${type}`
        event[k] = event[k] || []
        event[k].push({
          ...c,
          callback,
        })
      })
    })

  // delegate from the root node
  Object.entries(event).forEach(([k, listeners]) => {
    const [scope, type] = k.split(":")
    const contextNode = scope === "global" ? document.body : rootNode
    contextNode.addEventListener(type, (e) => {
      listeners
        .filter(
          ({ select }) => select === ":self" || (e.target as Element).matches(select)
        )
        .forEach(({ callback, getNodes }) => {
          const { target } = e
          const targets = getNodes()
          const index = targets.indexOf(target as Element)

          if (typeof callback === "function") {
            callback(e, store, index)
          }
          if (typeof callback === "string") {
            // Legacy string handlers receive a DOM index; reducers define the public payload type.
            const dispatch = store.dispatch as unknown as (
              name: string,
              index: number,
            ) => Promise<void>
            dispatch(callback, index)
          }
        })
    })
  })

  const onChange = (state: State) => {
    elements.forEach((c) => {
      const { attribute, sync, getNodes } = c

      const targets = getNodes()

      targets.forEach((target, i) => {
        if (attribute) {
          write(target!, attribute(state, i))
        }
        if (sync) {
          const value = state[sync]

          const input = target as HTMLInputElement
          if (input.value !== value) input.value = value as string
        }
      })
    })
  }

  store.subscribe(onChange)
  store.set(state)
}
