import { initialise } from "./initialise.js"
import { Store } from "./store.js"

export const Mosaic = (node, config) => {
  const store = Store({
    ...config,
  })

  initialise(node, config, store)

  return store
}

export const $ = Mosaic
