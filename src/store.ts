import { Message } from "./message.js"
import type { ActionHandlers, Controller, Dispatch, StoreConfig } from "./types.js"

interface Completion {
  resolve: () => void
  reject: (reason: unknown) => void
}

// Binding internals are kept separate from the controller returned to consumers.
export interface StateStore<State extends object, Actions> {
  controller: Controller<State, Actions>
  initialise(state: State, render: (state: State) => void): void
  patch(state: Partial<State>): void
}

export function Store<
  State extends object,
  Actions extends ActionHandlers<State> = {},
>({
  actions: actionHandlers = {} as Actions,
  getState: getStateWrapper = (v) => v,
}: StoreConfig<State, Actions>): StateStore<State, Actions> {
  let state: State
  let render: (state: State) => void
  let frame: number | null = null
  let pending: Completion[] = []
  const message = Message<[State]>()

  function commit(next: State) {
    state = getStateWrapper({ ...next })
  }

  function getState() {
    return { ...state }
  }

  function schedule() {
    if (frame === null) frame = requestAnimationFrame(flush)
  }

  function flush() {
    frame = null
    const completions = pending
    pending = []
    const snapshot = getState()
    const errors: unknown[] = []

    try {
      render(snapshot)
    } catch (error) {
      errors.push(error)
    }
    errors.push(...message.publish(snapshot))

    if (errors.length) {
      const error = errors.length === 1
        ? errors[0]
        : new AggregateError(errors, "Errors while publishing a state update")
      completions.forEach(({ reject }) => reject(error))
      // Sync bindings can schedule a frame without a dispatch promise to reject.
      if (completions.length === 0) reportError(error)
    } else {
      completions.forEach(({ resolve }) => resolve())
    }
  }

  const dispatch: Dispatch<Actions> = (type, ...payload) => {
    try {
      if (!Object.hasOwn(actionHandlers, type)) {
        throw new Error(`Unknown action "${type}"`)
      }
      if (typeof actionHandlers[type] !== "function") {
        throw new TypeError(`Action "${type}" is not a function`)
      }
      const handler = actionHandlers[type] as unknown as (
        state: State,
        payload: unknown,
      ) => State
      commit(handler.call(actionHandlers, getState(), payload[0]))

      return new Promise<void>((resolve, reject) => {
        pending.push({ resolve, reject })
        schedule()
      })
    } catch (error) {
      return Promise.reject(error)
    }
  }

  const controller: Controller<State, Actions> = {
    dispatch,
    getState,
    subscribe: message.subscribe,
  }

  return {
    controller,
    initialise: (initial: State, onChange: (state: State) => void) => {
      commit(initial)
      render = onChange
      render(getState())
    },
    patch: (patch: Partial<State>) => {
      commit({ ...getState(), ...patch })
      schedule()
    },
  }
}
