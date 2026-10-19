import { afterEach, assert, expect, it, vi } from "vitest"
import { Mosaic, type Controller, type EventContext } from "../src/index.js"
import { nextFrame } from "./helpers/browser.js"

const roots: Element[] = []
const controllers: { destroy(): void }[] = []
function root(html: string) {
  const node = document.createElement("div")
  node.innerHTML = html
  document.body.append(node)
  roots.push(node)
  return node
}
function track<T extends { destroy(): void }>(controller: T): T {
  controllers.push(controller)
  return controller
}
afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.destroy())
  roots.splice(0).forEach((node) => node.remove())
  vi.restoreAllMocks()
})

it("passes the bound element and captured index for child clicks and action shorthand", async () => {
  const node = root('<button><span>First</span></button><button><span>Second</span></button>')
  const buttons = node.querySelectorAll("button")
  let payload: EventContext<{ selected: number }> | undefined
  const controller = track(Mosaic(node, {
    state: { selected: -1 },
    actions: {
      select: (state, context: EventContext<{ selected: number }>) => {
        payload = context
        return { ...state, selected: context.index }
      },
    },
    elements: [{
      select: "button",
      attribute: ({ state, element, index }) => ({
        "data-selected": String(state.selected === index),
        "data-tag": element.tagName,
      }),
      on: { click: "select" },
    }],
  }))
  buttons[1].querySelector("span")!.click()
  assert.equal(controller.getState().selected, 1)
  assert.strictEqual(payload!.element, buttons[1])
  assert.strictEqual(payload!.event.target, buttons[1].firstChild)
  assert.deepEqual(payload!.state, { selected: -1 })
  assert.strictEqual(payload!.dispatch, controller.dispatch)
  assert.strictEqual(payload!.getState, controller.getState)
  await nextFrame()
  assert.equal(buttons[1].getAttribute("data-selected"), "true")
  assert.equal(buttons[1].getAttribute("data-tag"), "BUTTON")
})

it("captures matches and their document order once at mount", async () => {
  const node = root("<button>First</button><button>Second</button>")
  const original = [...node.children]
  const seen: number[] = []
  const controller = track(Mosaic(node, {
    state: { count: 0 },
    actions: { increment: (state) => ({ count: state.count + 1 }) },
    elements: [{
      select: "button",
      attribute: ({ state, index }) => ({ "data-value": `${index}:${state.count}` }),
      on: { click: ({ index }) => { seen.push(index) } },
    }],
  }))
  const late = document.createElement("button")
  node.prepend(late)
  node.prepend(original[1])
  late.click()
  ;(original[1] as HTMLElement).click()
  await controller.dispatch("increment")
  assert.deepEqual(seen, [1])
  assert.equal(late.getAttribute("data-value"), null)
  assert.equal(original[1].getAttribute("data-value"), "1:1")
})

it("scopes matches to descendants of each mounting root", () => {
  const first = root('<button>First</button><section><button>Nested</button></section>')
  const second = root('<button>Second</button>')
  first.className = "match"
  first.querySelectorAll("button").forEach((button) => { button.className = "match" })
  second.querySelector("button")!.className = "match"
  const matched = vi.fn()
  track(Mosaic(first, { elements: [
    { select: ".match", attribute: () => ({ "data-bound": "first" }), on: { click: matched } },
    { select: ":scope > button", attribute: () => ({ "data-direct": "yes" }) },
  ] }))
  assert.equal(first.getAttribute("data-bound"), null)
  assert.equal(first.querySelector("button")!.getAttribute("data-bound"), "first")
  assert.equal(first.querySelector("section button")!.getAttribute("data-bound"), "first")
  assert.equal(second.querySelector("button")!.getAttribute("data-bound"), null)
  assert.equal(first.querySelector("button")!.getAttribute("data-direct"), "yes")
  assert.equal(first.querySelector("section button")!.getAttribute("data-direct"), null)
  first.click()
  second.querySelector("button")!.click()
  assert.equal(matched.mock.calls.length, 0)
  first.querySelector<HTMLButtonElement>("section button")!.click()
  assert.equal(matched.mock.calls.length, 1)
})

it("accepts empty matches and retains original selector membership", async () => {
  const node = root('<button class="bound">Original</button>')
  const original = node.querySelector("button")!
  const emptyRender = vi.fn()
  const emptyEvent = vi.fn()
  const click = vi.fn()
  const controller = track(Mosaic(node, {
    state: { count: 0 },
    actions: { increment: (state) => ({ count: state.count + 1 }) },
    elements: [
      { select: ".missing", attribute: emptyRender, on: { click: emptyEvent } },
      { select: ".bound", attribute: ({ state }) => ({ "data-count": state.count }), on: { click } },
    ],
  }))
  original.className = ""
  const late = document.createElement("button")
  late.className = "bound missing"
  node.append(late)
  original.click()
  late.click()
  await controller.dispatch("increment")
  assert.equal(original.getAttribute("data-count"), "1")
  assert.equal(late.getAttribute("data-count"), null)
  assert.equal(click.mock.calls.length, 1)
  assert.equal(emptyRender.mock.calls.length, 0)
  assert.equal(emptyEvent.mock.calls.length, 0)
})

it("listens directly to non-bubbling focus events and removes listeners on destroy", () => {
  const node = root("<input>")
  const input = node.querySelector("input")!
  const focus = vi.fn()
  const controller = track(Mosaic(node, { elements: [{ select: "input", on: { focus } }] }))
  input.focus()
  assert.equal(focus.mock.calls.length, 1)
  assert.strictEqual(focus.mock.calls[0][0].element, input)
  controller.destroy()
  input.blur()
  input.focus()
  assert.equal(focus.mock.calls.length, 1)
})

it("allows normal bubbling and duplicate bindings", () => {
  const node = root("<section><button><span>Click</span></button></section>")
  const calls: string[] = []
  track(Mosaic(node, { elements: [
    { select: "section", on: { click: () => { calls.push("parent") } } },
    { select: "button", on: { click: () => { calls.push("child") } } },
    { select: "button", on: { click: () => { calls.push("duplicate") } } },
  ] }))
  node.querySelector("span")!.click()
  assert.deepEqual(calls, ["child", "duplicate", "parent"])
})

it("cancels queued rendering, rejects pending dispatches, and keeps committed state", async () => {
  const node = root("<output></output>")
  const output = node.firstElementChild!
  const render = vi.fn()
  const subscriber = vi.fn()
  const controller = track(Mosaic(node, {
    state: { count: 0 },
    actions: { increment: (state) => ({ count: state.count + 1 }) },
    elements: [{ select: "output", attribute: ({ state }) => {
      render()
      return { "data-count": state.count }
    } }],
  }))
  const unsubscribe = controller.subscribe(subscriber)
  const results = Promise.allSettled([controller.dispatch("increment"), controller.dispatch("increment")])
  controller.destroy()
  controller.destroy()
  for (const result of await results) {
    assert.equal(result.status, "rejected")
    if (result.status === "rejected") assert.equal(result.reason.name, "AbortError")
  }
  await expect(controller.dispatch("increment")).rejects.toMatchObject({ name: "AbortError" })
  controller.subscribe(subscriber)()
  unsubscribe()
  await nextFrame()
  assert.deepEqual(controller.getState(), { count: 2 })
  assert.equal(output.getAttribute("data-count"), "0")
  assert.equal(render.mock.calls.length, 1)
  assert.equal(subscriber.mock.calls.length, 0)
})

it("rejects active and newly queued dispatches when destroyed during publication", async () => {
  const node = root("")
  const controller = track(Mosaic(node, {
    state: { count: 0 },
    actions: { increment: (state) => ({ count: state.count + 1 }) },
  }))
  let followup: Promise<unknown> | undefined
  const later = vi.fn()
  controller.subscribe(() => {
    followup = controller.dispatch("increment").catch((error: DOMException) => error.name)
    controller.destroy()
  })
  controller.subscribe(later)
  await expect(controller.dispatch("increment")).rejects.toMatchObject({ name: "AbortError" })
  assert.equal(await followup, "AbortError")
  await nextFrame()
  assert.equal(later.mock.calls.length, 0)
})

it("stops rendering when destroyed by a rendering callback", async () => {
  const node = root("<output></output><output></output>")
  let controller: Controller<{ count: number }, { increment(state: { count: number }): { count: number } }>
  controller = track(Mosaic(node, {
    state: { count: 0 },
    actions: { increment: (state) => ({ count: state.count + 1 }) },
    elements: [{ select: "output", attribute: ({ state }) => {
      if (state.count) controller.destroy()
      return { "data-count": state.count }
    } }],
  }))
  await expect(controller.dispatch("increment")).rejects.toMatchObject({ name: "AbortError" })
  for (const output of node.children) assert.equal(output.getAttribute("data-count"), "0")
})

it("rebinds the same nodes after removing sync and consumer listeners", async () => {
  const node = root('<input value="initial">')
  const input = node.querySelector("input")!
  const oldInput = vi.fn()
  const external = vi.fn()
  input.addEventListener("input", external)
  const first = track(Mosaic(node, { state: { value: "" }, elements: [{ select: "input", sync: "value", on: { input: oldInput } }] }))
  first.destroy()
  const currentInput = vi.fn()
  const second = track(Mosaic(node, { state: { value: "" }, elements: [{ select: "input", sync: "value", on: { input: currentInput } }] }))
  input.value = "changed"
  input.dispatchEvent(new Event("input"))
  await nextFrame()
  assert.equal(first.getState().value, "initial")
  assert.equal(second.getState().value, "changed")
  assert.equal(oldInput.mock.calls.length, 0)
  assert.equal(currentInput.mock.calls[0][0].state.value, "changed")
  assert.equal(external.mock.calls.length, 1)
  second.destroy()
  assert.equal(input.value, "changed")
  input.removeEventListener("input", external)
})

it("removes installed listeners when mounting fails", () => {
  const node = root("<button></button>")
  const click = vi.fn()
  assert.throws(() => Mosaic(node, { elements: [{ select: "button", on: { click }, attribute: () => { throw new Error("mount failed") } }] }))
  node.querySelector("button")!.click()
  assert.equal(click.mock.calls.length, 0)
})

it("handles destruction of dispatches started by event shorthand and async handlers", async () => {
  const node = root("<button>Action</button><button>Async</button>")
  const buttons = node.querySelectorAll("button")
  const reported = vi.spyOn(globalThis, "reportError").mockImplementation(() => {})
  const controller = track(Mosaic(node, {
    state: { count: 0 },
    actions: { increment: (state) => ({ count: state.count + 1 }) },
    elements: [
      { select: "button:first-child", on: { click: "increment" } },
      { select: "button:last-child", on: { click: async ({ dispatch }) => { await dispatch("increment") } } },
    ],
  }))
  buttons[0].click()
  buttons[1].click()
  controller.destroy()
  await nextFrame()
  assert.equal(reported.mock.calls.length, 0)
})

it("reports rejected event handlers and action shorthand without leaving unhandled promises", async () => {
  const node = root("<button>Action</button><button>Async</button>")
  const buttons = node.querySelectorAll("button")
  const failure = new Error("action failed")
  const reported = vi.spyOn(globalThis, "reportError").mockImplementation(() => {})
  track(Mosaic(node, {
    actions: { fail: () => { throw failure } },
    elements: [
      { select: "button:first-child", on: { click: "fail" } },
      { select: "button:last-child", on: { click: async () => { throw failure } } },
    ],
  }))
  buttons[0].click()
  buttons[1].click()
  await nextFrame()
  assert.deepEqual(reported.mock.calls, [[failure], [failure]])
})
