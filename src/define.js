import { configure } from "./update.js"
import { render } from "./render.js"
import { mergeSlots } from "./mergeSlots.js"
import {
  applyAttribute,
  attributeToProp,
  isPrimitive,
  pascalToKebab,
  kebabToPascal,
} from "./helpers.js"

export const define = (name, factory, template) =>
  customElements.define(
    name,
    class extends HTMLElement {
      async connectedCallback() {
        if (!this.initialised) {
          let config = factory(this)

          if (config instanceof Promise) config = await config

          let { subscribe, shadow, observe = [] } = config

          this.connectedCallback = config.connectedCallback
          this.disconnectedCallback = config.disconnectedCallback

          const { dispatch, getState, onUpdate, flush } = configure(
            config,
            this
          )

          let initialState = getState()

          observe = observe.map(kebabToPascal)

          let observedAttributes = observe.map(pascalToKebab)

          let sa = this.setAttribute
          this.setAttribute = (k, v) => {
            if (observedAttributes.includes(k)) {
              let { name, value } = attributeToProp(k, v)

              dispatch({
                type: "SET",
                payload: { name, value },
              })
            }
            sa.apply(this, [k, v])
          }
          let ra = this.removeAttribute
          this.removeAttribute = (k) => {
            if (observedAttributes.includes(k)) {
              let { name, value } = attributeToProp(k, null)
              dispatch({
                type: "SET",
                payload: { name, value },
              })
            }
            ra.apply(this, [k])
          }

          observedAttributes.forEach((name) => {
            let property = attributeToProp(name).name
            let value

            if (this.hasAttribute(name)) {
              value = this.getAttribute(name)
            } else {
              value = this[property] || initialState[property]
            }

            Object.defineProperty(this, property, {
              get() {
                return getState()[property]
              },
              set(v) {
                dispatch({
                  type: "SET",
                  payload: { name: property, value: v },
                })
                if (isPrimitive(v)) {
                  applyAttribute(this, property, v)
                }
              },
            })

            this[property] = value
          })

          let beforeMountCallback

          if (shadow) {
            this.attachShadow({
              mode: shadow,
            })
          } else {
            beforeMountCallback = (frag) => mergeSlots(this, frag)
          }

          onUpdate(
            render(
              this.shadowRoot || this,
              { getState, dispatch },
              template,
              () => {
                observe.forEach((k) => {
                  let v = getState()[k]
                  if (isPrimitive(v)) applyAttribute(this, k, v)
                })
                subscribe?.(getState())
                flush()
              },
              beforeMountCallback
            )
          )
          this.initialised = true

          this.connectedCallback?.({ dispatch, getState })
        }
      }
      disconnectedCallback() {
        this.disconnectedCallback?.()
      }
    }
  )