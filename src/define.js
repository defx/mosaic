import { initialise } from "./initialise.js"
import { Store } from "./store.js"
import { Message } from "./message.js"

export const define = (name, configFn) => {
  if (customElements.get(name)) return

  customElements.define(
    name,
    class extends HTMLElement {
      async connectedCallback() {
        let nextTickSubscribers = []
        const config = configFn(this)

        const api = {
          nextTick: (fn) => nextTickSubscribers.push(fn),
        }

        const message = Message({
          postPublish: () => {
            nextTickSubscribers.forEach((fn) => fn(state))
            nextTickSubscribers = []
          },
        })

        const observed = new Set()
        const host = this

        const wrap = (state) => {
          return new Proxy(state, {
            get(_, name) {
              if (observed.has(name) === false) {
                Object.defineProperty(host, name, {
                  get() {
                    return getState()[name]
                  },
                  set(value) {
                    merge({ [name]: value })
                  },
                })

                observed.add(name)
              }
              return Reflect.get(...arguments)
            },
          })
        }

        const onChangeCallback = (state) => {
          message.publish(wrap(state), config)
        }

        const store = Store({
          ...config,
          api,
          onChangeCallback,
        })

        const { getState, merge } = store

        const initialState = initialise(
          this,
          message.subscribe,
          config,
          store,
          ((state) => (typeof state === "function" ? state({}) : state))(
            config.state || {}
          )
        )

        store.set(initialState)
        onChangeCallback(store.getState())

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

        config.connectedCallback?.(this, store)
      }
    }
  )
}
