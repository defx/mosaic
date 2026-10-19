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
  own(cleanup: () => void): void
  isDestroyed(): boolean
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
  let active: Completion[] = []
  let destroyed = false
  const cleanups: (() => void)[] = []
  const abort = () => new DOMException("Mosaic has been destroyed", "AbortError")
  const message = Message<[State]>()

  function commit(next: State) {
    state = getStateWrapper({ ...next })
  }

  function getState() {
    return { ...state }
  }

  function schedule() {
    if (!destroyed && frame === null) frame = requestAnimationFrame(flush)
  }

  function flush() {
    frame = null
    if (destroyed) return
    const completions = pending
    pending = []
    active = completions
    const snapshot = getState()
    const errors: unknown[] = []

    try {
      render(snapshot)
    } catch (error) {
      errors.push(error)
    }
    if (!destroyed) errors.push(...message.publish(snapshot))
    active = []
    if (destroyed) return

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
      if (destroyed) throw abort()
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
      const next = handler.call(actionHandlers, getState(), payload[0])
      if (destroyed) throw abort()
      commit(next)

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
    subscribe: (callback) => destroyed ? () => {} : message.subscribe(callback),
    destroy() {
      if (destroyed) return
      destroyed = true
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
      const error = abort()
      const completions = [...active, ...pending]
      completions.forEach(({ reject }) => reject(error))
      active = []
      pending = []
      message.clear()
      cleanups.splice(0).forEach((cleanup) => cleanup())
      render = () => {}
    },
  }

  return {
    controller,
    own: (cleanup) => { cleanups.push(cleanup) },
    isDestroyed: () => destroyed,
    initialise: (initial: State, onChange: (state: State) => void) => {
      commit(initial)
      render = onChange
      render(getState())
    },
    patch: (patch: Partial<State>) => {
      if (destroyed) return
      commit({ ...getState(), ...patch })
      schedule()
    },
  }
}
