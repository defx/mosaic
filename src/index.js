import { initialise } from "./initialise.js"
import { Store } from "./store.js"
import { Message } from "./message.js"

export const Mosaic = (node, config) => {
  let nextTickSubscribers = []

  const api = {
    nextTick: (fn) => nextTickSubscribers.push(fn),
  }

  const message = Message({
    postPublish: () => {
      nextTickSubscribers.forEach((fn) => fn(state))
      nextTickSubscribers = []
    },
  })

  const onChangeCallback = (state) => message.publish(state, config)

  const store = Store({
    ...config,
    api,
    onChangeCallback,
  })

  const initialState = initialise(node, message.subscribe, config, store)

  store.set({
    ...(config.state || {}),
    ...initialState,
  })
  onChangeCallback(store.getState())

  return store
}

export const $ = Mosaic
