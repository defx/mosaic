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
  action: actionHandlers = {},
  getState: getStateWrapper = (v) => v,
  onChangeCallback,
  api = {},
}) {
  let state

  const transition = debounce(() => onChangeCallback(getState()))

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
  }

  return {
    dispatch,
    getState,
    merge: (o) => {
      set({ ...getState(), ...o })
      transition()
    },
    set,
    ...api,
  }
}
