import { Message } from "./message.js"

function debounce(fn) {
  let id
  return (...args) => {
    if (!id) {
      id = requestAnimationFrame(() => {
        fn(...args)
        id = null
      })
    }
  }
}

export function Store({
  actions: actionHandlers = {},
  getState: getStateWrapper = (v) => v,
}) {
  let state
  let nextTickCallbacks = []

  const message = Message({
    postPublish: () => {
      nextTickCallbacks.forEach((fn) => {
        fn()
      })
      nextTickCallbacks = []
    },
  })

  const transition = debounce(() => {
    message.publish(getState())
  })

  function set(o) {
    state = getStateWrapper({ ...o })
  }

  function getState() {
    return { ...state }
  }

  function dispatch(type, action) {
    if (type in actionHandlers) {
      const x = actionHandlers[type](getState(), action)
      set(x)
      transition()
    }

    const promise = new Promise((resolve) => {
      nextTickCallbacks.push(resolve)
    })

    return promise
  }

  return {
    dispatch,
    getState,
    merge: (o) => {
      set({ ...getState(), ...o })
      transition()
    },
    set: (o) => {
      set(o)
      message.publish(getState())
    },
    subscribe: message.subscribe,
  }
}
