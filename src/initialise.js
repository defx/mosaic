import { listItems, listData, listSync } from "./list.js"
import { write } from "./xo.js"

const matchGlobalSelector = (q) => q.match(/^:global\(([^)].+)\)$/)?.[1]

export function initialise(rootNode, config, store) {
  const event = {}

  let { state = {} } = config

  const elements = (config.elements || []).map((o) => {
    const { select } = o

    const globalSelector = matchGlobalSelector(select)

    return {
      ...o,
      select: globalSelector || select,
      contextNode: globalSelector ? document.body : rootNode,
      scope: globalSelector ? "global" : "local",
    }
  })

  // derive initial state from input directives...
  elements
    .filter(({ sync }) => sync)
    .forEach(({ select, sync }) => {
      const targets = [...rootNode.querySelectorAll(select)]
      targets.forEach((target) => {
        state = { ...state, [sync]: target.value }

        event["local:input"] = event["local:input"] || []
        event["local:input"].push({
          select,
          callback: (event) => {
            const { target } = event
            store.merge({ [sync]: target.value })
          },
        })
      })
    })

  // find event listeners
  elements.forEach((c) => {
    const { on, scope } = c
    if (on) {
      Object.entries(on).forEach(([type, callback]) => {
        const k = `${scope}:${type}`
        event[k] = event[k] || []
        event[k].push({
          ...c,
          callback,
        })
      })
    }
  })

  // @todo: replace matches/iteration with weakmap

  // delegate from the root node
  Object.entries(event).forEach(([k, listeners]) => {
    const [scope, type] = k.split(":")
    const contextNode = scope === "global" ? document.body : rootNode
    contextNode.addEventListener(type, (e) => {
      listeners
        .filter(({ select }) => e.target.matches(select))
        .forEach(({ select, callback }) => {
          const { target } = e
          const targets = [...contextNode.querySelectorAll(select)]
          const index = targets.indexOf(target)

          if (typeof callback === "function") {
            callback(e, store, index)
          }
          if (typeof callback === "string") {
            store.dispatch(callback, index)
          }
        })
    })
  })

  const onChange = (state) => {
    // lists first
    elements
      .filter(({ list }) => list)
      .forEach(({ select, list }) => {
        const targets = [...rootNode.querySelectorAll(select)]
        targets.forEach((target) => {
          const items = listItems(target, list.select)
          const curr = listData(items)
          const next = state[list.from]
          listSync(target, items, curr, next, list.template)
        })
      })

    // then the rest...
    elements.forEach((c) => {
      const { select, attribute, sync, contextNode } = c

      const targets = [...contextNode.querySelectorAll(select)]

      targets.forEach((target, i) => {
        if (attribute) {
          write(target, attribute(state, i))
        }
        if (sync) {
          const value = state[sync]

          if (target.value !== value) target.value = value
        }
      })
    })
  }

  store.subscribe(onChange)
  store.set(state)
}
