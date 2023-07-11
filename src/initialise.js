import { listItems, listData, listSync } from "./list.js"
import { write } from "./xo.js"

export function initialise(rootNode, config, store) {
  let { state = {} } = config
  const elements = (config.elements || []).map((v) => {
    const select = v.select || v.selectAll
    return {
      ...v,
      select,
      getNodes: () => {
        if (select) {
          return [rootNode.querySelector(select)]
        } else if (selectAll) {
          return { ...rootNode.querySelectorAll(select) }
        }
      },
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

        event.input = event.input || []
        event.input.push({
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
      const { on } = c

      Object.entries(on).forEach(([type, callback]) => {
        event[type] = event[type] || []
        event[type].push({
          ...c,
          callback,
        })
      })
    })

  // delegate from the root node
  Object.entries(event).forEach(([type, listeners]) => {
    rootNode.addEventListener(type, (e) => {
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
      const { select, attribute, sync } = c

      const targets = [...rootNode.querySelectorAll(select)]

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
