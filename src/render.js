import { TEXT, ATTRIBUTE, INPUT, EVENT, REPEAT } from "./constants.js"
import { updateFormControl } from "./formControl.js"
import {
  debounce,
  fragmentFromTemplate,
  getValueAtPath,
  last,
  walk,
} from "./helpers.js"
import { compareKeyedLists, getBlocks, parseEach, updateList } from "./list.js"
import { getParts, getValueFromParts, hasMustache } from "./token.js"
import { applyAttribute } from "./attribute.js"
import { createContext } from "./context.js"

export const render = (
  target,
  { getState, dispatch },
  template,
  updatedCallback,
  beforeMountCallback
) => {
  let observer = () => {
    let subscribers = new Set()
    return {
      publish: (cb) => {
        for (let fn of subscribers) {
          fn()
        }
        cb?.()
      },
      subscribe(fn) {
        subscribers.add(fn)
      },
    }
  }

  const _ = (a, b) => (a === undefined ? b : a)

  const createSubscription = {
    [TEXT]: ({ value, node, context }, { getState }) => {
      return {
        handler: () => {
          let state = context ? context.wrap(getState()) : getState()
          let a = node.textContent
          let b = getValueFromParts(state, getParts(value))
          if (a !== b) node.textContent = b
        },
      }
    },
    [ATTRIBUTE]: ({ value, node, name, context }, { getState }) => {
      return {
        handler: () => {
          let state = context ? context.wrap(getState()) : getState()
          let b = getValueFromParts(state, getParts(value))

          applyAttribute(node, name, b)

          if (node.nodeName === "OPTION") {
            let path = node.parentNode.getAttribute("name")
            let selected = getValueAtPath(path, state)
            node.selected = selected === b
          }
        },
      }
    },
    [INPUT]: ({ node, path, context }, { getState, dispatch }) => {
      node.addEventListener("input", () => {
        let value =
          node.getAttribute("type") === "checkbox" ? node.checked : node.value

        if (value.trim?.().length && !isNaN(value)) value = +value

        if (context) {
          let state = context.wrap(getState())
          state[path] = value
          dispatch({
            type: "MERGE",
            payload: state,
          })
        } else {
          dispatch({
            type: "SET",
            payload: {
              name: path,
              value,
              context,
            },
          })
        }
      })

      return {
        handler: () => {
          let state = context ? context.wrap(getState()) : getState()
          updateFormControl(node, getValueAtPath(path, state))
        },
      }
    },
    [EVENT]: (
      { node, eventType, actionType, context },
      { dispatch, getState }
    ) => {
      /* 
      
      NB that context is only passed for local actions not prefixed with "$"

      */

      node.addEventListener(eventType, (event) => {
        let isGlobal = actionType.startsWith("$")

        let action = {
          type: actionType,
          event,
        }

        if (!isGlobal)
          action.context = context ? context.wrap(getState()) : getState()

        dispatch(action)

        if (isGlobal) {
          node.dispatchEvent(
            new CustomEvent(actionType, {
              detail: action,
              bubbles: true,
            })
          )
        }
      })
      return {
        handler: () => {},
      }
    },
    [REPEAT]: (
      {
        node,
        context,
        map,
        path,
        identifier,
        index,
        key,
        blockIndex,
        hydrate,
        pickupNode,
      },
      { getState }
    ) => {
      let oldValue
      node.$t = blockIndex - 1

      const initialiseBlock = (rootNode, i, k, exitNode) => {
        walk(
          rootNode,
          multi(
            (node) => {
              if (node === exitNode) return false
            },
            bindAll(
              map,
              hydrate,
              createContext(
                (context?.get() || []).concat({
                  path,
                  identifier,
                  key,
                  index,
                  i,
                  k,
                })
              )
            ),
            (child) => (child.$t = blockIndex)
          )
        )
      }

      function firstChild(v) {
        return (v.nodeType === v.DOCUMENT_FRAGMENT_NODE && v.firstChild) || v
      }

      const createListItem = (datum, i) => {
        let k = datum[key]
        let frag = fragmentFromTemplate(node)
        initialiseBlock(firstChild(frag), i, k)
        return frag
      }

      if (hydrate) {
        let x = getValueAtPath(path, getState())
        let blocks = getBlocks(node)

        blocks.forEach((block, i) => {
          let datum = x[i]
          let k = datum?.[key]
          initialiseBlock(block[0], i, k, last(block).nextSibling)
        })

        pickupNode = last(last(blocks)).nextSibling
      }

      return {
        handler: () => {
          let state = context ? context.wrap(getState()) : getState()

          const newValue = Object.entries(getValueAtPath(path, state) || [])
          const delta = compareKeyedLists(key, oldValue, newValue)

          if (delta) {
            updateList(node, delta, newValue, createListItem)
          }
          oldValue = newValue.slice(0)
        },
        pickupNode,
      }
    },
  }

  const mediator = () => {
    const o = observer()
    return {
      bind(v) {
        let s = createSubscription[v.type](v, { getState, dispatch })
        o.subscribe(s.handler)
        return s
      },
      // scheduleUpdate: debounce((state, cb) => {
      //   return o.publish(state, cb)
      // }),
      update(cb) {
        return o.publish(cb)
      },
    }
  }

  const { bind, update } = mediator()

  let blockCount = 0

  const parse = (frag) => {
    let index = 0
    let map = {}

    walk(frag, (node) => {
      let x = []
      let pickupNode
      switch (node.nodeType) {
        case node.TEXT_NODE: {
          let value = node.textContent
          if (hasMustache(value)) {
            x.push({
              type: TEXT,
              value,
            })
          }
          break
        }
        case node.ELEMENT_NODE: {
          let each = parseEach(node)

          if (each) {
            let ns = node.namespaceURI
            let m

            if (ns.endsWith("/svg")) {
              node.removeAttribute("each")
              let tpl = document.createElementNS(ns, "defs")
              tpl.innerHTML = node.outerHTML
              node.parentNode.replaceChild(tpl, node)
              node = tpl
              m = parse(node.firstChild)
            } else {
              if (node.nodeName !== "TEMPLATE") {
                node.removeAttribute("each")
                let tpl = document.createElement("template")

                tpl.innerHTML = node.outerHTML
                node.parentNode.replaceChild(tpl, node)
                node = tpl
              }
              m = parse(node.content.firstChild)
            }

            pickupNode = node.nextSibling

            x.push({
              type: REPEAT,
              map: m,
              blockIndex: blockCount++,
              ...each,
              pickupNode,
            })

            break
          }

          let attrs = node.attributes
          let i = attrs.length
          while (i--) {
            let { name, value } = attrs[i]

            if (
              name === ":name" &&
              value &&
              (node.nodeName === "INPUT" ||
                node.nodeName === "SELECT" ||
                node.nodeName === "TEXTAREA")
            ) {
              x.push({
                type: INPUT,
                path: value,
              })

              node.removeAttribute(name)
              node.setAttribute("name", value)
            } else if (name.startsWith(":on")) {
              node.removeAttribute(name)
              let eventType = name.split(":on")[1]
              x.push({
                type: EVENT,
                eventType,
                actionType: value,
              })
            } else if (name.startsWith(":")) {
              let prop = name.slice(1)

              let v = value || prop

              if (!v.includes("{{")) v = `{{${v}}}`

              x.push({
                type: ATTRIBUTE,
                name: prop,
                value: v,
              })
              node.removeAttribute(name)
            }
          }
        }
      }
      if (x.length) map[index] = x
      index++
      return pickupNode
    })

    return map
  }

  const multi =
    (...fns) =>
    (...args) => {
      for (let fn of fns) {
        let v = fn(...args)
        if (v === false) return false
      }
    }

  const bindAll = (bMap, hydrate = 0, context) => {
    let index = 0
    return (node) => {
      let k = index
      let p
      if (k in bMap) {
        bMap[k].forEach((v) => {
          let x = bind({
            ...v,
            node,
            context,
            hydrate,
          })
          p = x.pickupNode
        })
        node.$i = index
      }
      index++
      return p
    }
  }

  let frag = fragmentFromTemplate(template)
  let map = parse(frag)

  walk(frag, bindAll(map))
  beforeMountCallback?.(frag)
  target.prepend(frag)
  update()

  return debounce(() => update(updatedCallback))
}