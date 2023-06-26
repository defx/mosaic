import { Mosaic } from "./index.js"

export const define = (name, configFn) => {
  if (customElements.get(name)) return

  customElements.define(
    name,
    class extends HTMLElement {
      async connectedCallback() {
        const config = configFn(this)

        // @todo: reflection
        const observed = new Set()

        const store = Mosaic(this, config)

        const { merge } = store

        const sa = this.setAttribute
        this.setAttribute = (name, value) => {
          if (observed.has(name)) {
            merge({ [name]: value })
          }
          return sa.apply(this, [name, value])
        }
        const ra = this.removeAttribute
        this.removeAttribute = (name) => {
          if (observed.has(name)) {
            merge({ [name]: null })
          }
          return ra.apply(this, [name])
        }
      }
    }
  )
}
