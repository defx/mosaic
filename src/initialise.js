import { listItems, listData, listSync } from "./list.js"
import { write } from "./xo.js"

const matchGlobalSelector = (q) => q.match(/^:global\(([^)].+)\)$/)?.[1]

export function initialise(rootNode, config, store) {
  let { state = {} } = config
  const elements = (config.elements || []).map((v) => {
    let select = v.select || v.selectAll
    const globalSelector = matchGlobalSelector(select)
    select = globalSelector || select
    return {
      ...v,
      select,
      getNodes: () => {
        const contextNode = globalSelector ? document.body : rootNode
        if (v.select) {
          return [contextNode.querySelector(select)]
        } else if (v.selectAll) {
          return [...contextNode.querySelectorAll(select)]
        }
      },
      scope: globalSelector ? "global" : "local",
    }
  })
  const event = {}

  // derive initial state from input directives...
  elements
    .filter(({ sync }) => sync)
    .forEach((c) => {
      const { sync, getNodes } = c
      const targets = getNodes()
      targets.forEach((target) => {
        state = { ...state, [sync]: target.value }

        event["local:input"] = event["local:input"] || []
        event["local:input"].push({
          ...c,
          callback: (event) => {
            const { target } = event
            store.merge({ [sync]: target.value })
          },
        })
      })
    })

  // find event listeners
  elements
    .filter(({ on }) => on)
    .forEach((c) => {
      const { on, scope } = c

      Object.entries(on).forEach(([type, callback]) => {
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
        .filter(({ select }) => e.target.matches(select))
        .forEach(({ callback, getNodes }) => {
          const { target } = e
          const targets = getNodes()
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
      const { select, attribute, sync, getNodes } = c

      const targets = getNodes()

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
