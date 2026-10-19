import { Message } from "./message.js"
import type { ActionHandlers, Controller, Dispatch, StoreConfig } from "./types.js"

function debounce(fn: () => void) {
  let id: number | null = null
  return () => {
    if (!id) {
      id = requestAnimationFrame(() => {
        fn()
        id = null
      })
    }
  }
}

export function Store<
  State extends object,
  Actions extends ActionHandlers<State> = {},
>({
  actions: actionHandlers = {} as Actions,
  getState: getStateWrapper = (v) => v,
}: StoreConfig<State, Actions>): Controller<State, Actions> {
  let state: State
  let nextTickCallbacks: (() => void)[] = []

  const message = Message<[State]>({
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

  function set(o: State) {
    state = getStateWrapper({ ...o })
  }

  function getState() {
    return { ...state }
  }

  const dispatch: Dispatch<Actions> = (type, ...payload) => {
    if (type in actionHandlers) {
      const handler = actionHandlers[type] as unknown as (
        state: State,
        payload: unknown,
      ) => State
      const x = handler.call(actionHandlers, getState(), payload[0])
      set(x)
      transition()
    }

    const promise = new Promise<void>((resolve) => {
      nextTickCallbacks.push(resolve)
    })

    return promise
  }

  return {
    dispatch,
    getState,
    merge: (o: Partial<State>) => {
      set({ ...getState(), ...o })
      transition()
    },
    set: (o: State) => {
      set(o)
      message.publish(getState())
    },
    subscribe: message.subscribe,
  }
}
