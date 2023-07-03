import { Mosaic } from "./index.js"

export const define = (name, configFn) => {
  if (customElements.get(name)) return

  customElements.define(
    name,
    class extends HTMLElement {
      async connectedCallback() {
        const config = configFn(this)

        const { observedAttributes = [] } = config

        const store = Mosaic(this, config)

        const { getState, merge } = store

        const sa = this.setAttribute
        this.setAttribute = (name, value) => {
          if (observedAttributes.includes(name)) {
            merge({ [name]: value })
          }
          return sa.apply(this, [name, value])
        }
        const ra = this.removeAttribute
        this.removeAttribute = (name) => {
          if (observedAttributes.includes(name)) {
            merge({ [name]: null })
          }
          return ra.apply(this, [name])
        }

        observedAttributes.forEach((name) => {
          Object.defineProperty(this, name, {
            get() {
              return getState()[name]
            },
            set(value) {
              merge({ [name]: value })
            },
          })
        })
      }
    }
  )
}
