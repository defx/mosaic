import { Mosaic } from "../../src/index.js"

// Compile-only checks: state and action types must be inferred from ordinary usage.
const controller = Mosaic(document.createElement("div"), {
  state: { count: 0, label: "" },
  actions: {
    increment: (state, amount: number) => ({ ...state, count: state.count + amount }),
    rename: (state, label: string) => ({ ...state, label }),
    reset: (state) => ({ ...state, count: 0 }),
  },
  elements: [
    {
      select: "input",
      sync: "label",
      attribute: ({ state }) => ({ title: state.label }),
      on: {
        keydown: ({ event, dispatch, getState }) => {
          const key: string = event.key
          dispatch("rename", key)
          // @ts-expect-error Event handlers retain action payload types.
          dispatch("increment", "wrong")
          // @ts-expect-error Event handlers retain the state shape.
          getState().missing
        },
      },
    },
  ],
})

controller.dispatch("increment", 2)
controller.dispatch("rename", "Updated")
controller.dispatch("reset")
const count: number = controller.getState().count
const label: string = controller.getState().label
const unsubscribe = controller.subscribe((state) => {
  const value: number = state.count
  void value
})
unsubscribe()
unsubscribe()

// @ts-expect-error Action names are restricted to declared reducers.
controller.dispatch("missing")
// @ts-expect-error Numeric payloads cannot be strings.
controller.dispatch("increment", "wrong")
// @ts-expect-error Required action payloads cannot be omitted.
controller.dispatch("increment")
// @ts-expect-error No-payload actions do not accept arbitrary values.
controller.dispatch("reset", 2)
// @ts-expect-error State keys are known.
controller.getState().missing
// @ts-expect-error State value types are preserved.
controller.getState().count = "wrong"
// @ts-expect-error State replacement is not a public controller operation.
controller.set({ count: 1, label: "" })
// @ts-expect-error State merging is not a public controller operation.
controller.merge({ count: 1 })

void count
void label

controller.destroy()

Mosaic(document.createElement("div"), {
  state: { count: 0 },
  actions: { increment: (state) => ({ count: state.count + 1 }) },
  elements: [{
    select: "button",
    on: { keydown: ({ event, state, element, index, dispatch, getState }) => {
      const key: string = event.key
      const tag: string = element.tagName
      const count: number = state.count + getState().count + index
      dispatch("increment")
      // @ts-expect-error Keyboard events retain their specific type.
      event.pointerId
      void [key, count, tag]
    } },
  }],
})

Mosaic(document.createElement("div"), { elements: [{
  // @ts-expect-error Bindings require CSS selector strings.
  select: document,
}] })

Mosaic(document.createElement("div"), { state: { label: "" }, elements: [{
  select: "input",
  attribute: ({ state, element, index }) => {
    const name: string = element.tagName
    const order: number = index
    // @ts-expect-error Rendering contexts retain the state shape.
    state.missing
    return { title: `${name}:${order}:${state.label}` }
  },
}] })
