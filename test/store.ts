import { afterEach, assert, describe, expect, it, vi } from "vitest"
import { Mosaic } from "../src/index.js"
import { nextFrame } from "./helpers/browser.js"

const roots: HTMLElement[] = []

function createRoot(html = "<output></output>") {
  const root = document.createElement("div")
  root.innerHTML = html
  document.body.append(root)
  roots.push(root)
  return root
}

function counter(onRender?: (count: number) => void) {
  const root = createRoot()
  const output = root.querySelector("output")!
  const controller = Mosaic(root, {
    state: { count: 0 },
    actions: {
      increment: (state, amount: number = 1) => ({
        ...state,
        count: state.count + amount,
      }),
    },
    elements: [{
      select: "output",
      attribute: ({ state }) => {
        onRender?.(state.count)
        return { "data-count": state.count }
      },
    }],
  })
  return { controller, output }
}

afterEach(() => {
  roots.splice(0).forEach((root) => root.remove())
  vi.restoreAllMocks()
})

describe("state publication", () => {
  it("initialises synchronously and exposes only the public controller", () => {
    const { controller, output } = counter()
    assert.deepEqual(controller.getState(), { count: 0 })
    assert.equal(output.getAttribute("data-count"), "0")
    assert.deepEqual(Object.keys(controller).sort(), ["destroy", "dispatch", "getState", "subscribe"])
  })

  it("commits consecutive actions immediately and renders their final state once", async () => {
    const renders: number[] = []
    const observed: [number, string | null][] = []
    const { controller, output } = counter((count) => renders.push(count))
    controller.subscribe((state) => {
      observed.push([state.count, output.getAttribute("data-count")])
    })

    const first = controller.dispatch("increment")
    const second = controller.dispatch("increment", 2)
    assert.equal(controller.getState().count, 3)
    assert.equal(output.getAttribute("data-count"), "0")
    assert.deepEqual(renders, [0])
    assert.deepEqual(observed, [])

    await Promise.all([first, second])
    assert.equal(output.getAttribute("data-count"), "3")
    assert.deepEqual(renders, [0, 3])
    assert.deepEqual(observed, [[3, "3"]])
  })

  it("renders subscriber-triggered actions in a later frame with their own completions", async () => {
    const { controller, output } = counter()
    const observed: number[] = []
    let followup: Promise<void> | undefined
    let followupResolved = false
    controller.subscribe((state) => {
      observed.push(state.count)
      if (state.count === 1) {
        followup = controller.dispatch("increment")
        followup.then(() => { followupResolved = true })
      }
    })

    await controller.dispatch("increment")
    assert.deepEqual(observed, [1])
    assert.equal(controller.getState().count, 2)
    assert.equal(output.getAttribute("data-count"), "1")
    assert.isFalse(followupResolved)
    assert.ok(followup)

    await followup
    assert.deepEqual(observed, [1, 2])
    assert.equal(output.getAttribute("data-count"), "2")
    assert.isTrue(followupResolved)
  })

  it("rejects every completion in a failed batch and still notifies other subscribers", async () => {
    const { controller, output } = counter()
    const failure = new Error("subscriber failed")
    const observed: number[] = []
    const unsubscribe = controller.subscribe(() => { throw failure })
    controller.subscribe((state) => observed.push(state.count))

    const results = await Promise.allSettled([
      controller.dispatch("increment"),
      controller.dispatch("increment"),
    ])
    assert.deepEqual(results, [
      { status: "rejected", reason: failure },
      { status: "rejected", reason: failure },
    ])
    assert.deepEqual(observed, [2])
    assert.equal(output.getAttribute("data-count"), "2")

    unsubscribe()
    await controller.dispatch("increment")
    assert.deepEqual(observed, [2, 3])
    assert.equal(output.getAttribute("data-count"), "3")
  })

  it("recovers from a render error on the next update", async () => {
    const failure = new Error("render failed")
    const { controller, output } = counter((count) => {
      if (count === 1) throw failure
    })
    const observed: number[] = []
    controller.subscribe((state) => observed.push(state.count))

    await expect(controller.dispatch("increment")).rejects.toBe(failure)
    assert.equal(controller.getState().count, 1)
    assert.equal(output.getAttribute("data-count"), "0")
    assert.deepEqual(observed, [1])

    await controller.dispatch("increment")
    assert.equal(output.getAttribute("data-count"), "2")
    assert.deepEqual(observed, [1, 2])
  })

  it("preserves all errors when rendering and a subscriber both fail", async () => {
    const renderFailure = new Error("render failed")
    const subscriberFailure = new Error("subscriber failed")
    const { controller } = counter((count) => {
      if (count === 1) throw renderFailure
    })
    controller.subscribe((state) => {
      if (state.count === 1) throw subscriberFailure
    })
    const observed: number[] = []
    controller.subscribe((state) => observed.push(state.count))

    await expect(controller.dispatch("increment")).rejects.toMatchObject({
      name: "AggregateError",
      errors: [renderFailure, subscriberFailure],
    })
    assert.deepEqual(observed, [1])
    await controller.dispatch("increment")
    assert.deepEqual(observed, [1, 2])
  })
})

describe("subscriptions", () => {
  it("returns an idempotent unsubscribe function", async () => {
    const { controller } = counter()
    const callback = vi.fn()
    const unsubscribe = controller.subscribe(callback)
    await controller.dispatch("increment")
    assert.equal(callback.mock.calls.length, 1)

    unsubscribe()
    unsubscribe()
    await controller.dispatch("increment")
    assert.equal(callback.mock.calls.length, 1)
  })

  it("keeps duplicate subscriptions independently owned", async () => {
    const { controller } = counter()
    const callback = vi.fn()
    const first = controller.subscribe(callback)
    const second = controller.subscribe(callback)
    first()
    await controller.dispatch("increment")
    assert.equal(callback.mock.calls.length, 1)
    second()
    await controller.dispatch("increment")
    assert.equal(callback.mock.calls.length, 1)
  })

  it("honours removal during publication and defers new subscriptions", async () => {
    const { controller } = counter()
    const removed = vi.fn()
    const added = vi.fn()
    let unsubscribe = () => {}
    let firstPublication = true
    controller.subscribe(() => {
      unsubscribe()
      if (firstPublication) {
        firstPublication = false
        controller.subscribe(added)
      }
    })
    unsubscribe = controller.subscribe(removed)

    await controller.dispatch("increment")
    assert.equal(removed.mock.calls.length, 0)
    assert.equal(added.mock.calls.length, 0)
    await controller.dispatch("increment")
    assert.equal(added.mock.calls.length, 1)
  })
})

describe("dispatch failures", () => {
  it("rejects unknown and inherited action names without changing state", async () => {
    const renders: number[] = []
    const { controller } = counter((count) => renders.push(count))
    const dispatch = controller.dispatch as unknown as (name: string) => Promise<void>

    for (const name of ["missing", "toString", "hasOwnProperty", "constructor", "__proto__"]) {
      await expect(dispatch(name)).rejects.toThrow(`Unknown action "${name}"`)
    }
    assert.deepEqual(controller.getState(), { count: 0 })
    assert.deepEqual(renders, [0])
    await controller.dispatch("increment")
    assert.deepEqual(renders, [0, 1])
  })

  it("rejects an unknown action independently of an already scheduled batch", async () => {
    const { controller, output } = counter()
    const dispatch = controller.dispatch as unknown as (name: string) => Promise<void>
    const valid = controller.dispatch("increment")
    await expect(dispatch("missing")).rejects.toThrow('Unknown action "missing"')
    await valid
    assert.equal(output.getAttribute("data-count"), "1")
  })

  it("allows an explicitly declared action that shadows a prototype method", async () => {
    const controller = Mosaic(createRoot(), {
      state: { count: 0 },
      actions: { toString: (state: { count: number }) => ({ count: state.count + 1 }) },
    })
    await controller.dispatch("toString")
    assert.equal(controller.getState().count, 1)
  })

  it("rejects reducer exceptions without committing a new state", async () => {
    const failure = new Error("reducer failed")
    const controller = Mosaic(createRoot(), {
      state: { count: 0 },
      actions: {
        fail: () => { throw failure },
        increment: (state) => ({ count: state.count + 1 }),
      },
    })
    await expect(controller.dispatch("fail")).rejects.toBe(failure)
    assert.equal(controller.getState().count, 0)
    await controller.dispatch("increment")
    assert.equal(controller.getState().count, 1)
  })
})

describe("binding-owned state updates", () => {
  it("keeps sync working internally without exposing state setters", async () => {
    const root = createRoot('<input value="DOM"><output></output>')
    const input = root.querySelector("input")!
    const output = root.querySelector("output")!
    const observed: string[] = []
    const controller = Mosaic(root, {
      state: { query: "configured" },
      actions: { clear: (state) => ({ ...state, query: "" }) },
      elements: [
        {
          select: "input",
          sync: "query",
          on: { input: ({ getState }) => { observed.push(getState().query) } },
        },
        { select: "output", attribute: ({ state }) => ({ "data-query": state.query }) },
      ],
    })
    assert.equal(controller.getState().query, "DOM")
    assert.equal(output.getAttribute("data-query"), "DOM")

    input.value = "typed"
    input.dispatchEvent(new Event("input", { bubbles: true }))
    assert.equal(controller.getState().query, "typed")
    assert.deepEqual(observed, ["typed"])
    assert.equal(output.getAttribute("data-query"), "DOM")
    await nextFrame()
    assert.equal(output.getAttribute("data-query"), "typed")

    await controller.dispatch("clear")
    assert.equal(input.value, "")
    assert.equal(output.getAttribute("data-query"), "")
    assert.notProperty(controller, "set")
    assert.notProperty(controller, "merge")
    assert.notProperty(controller, "patch")
  })

  it("reports render errors from sync updates and recovers without a dispatch promise", async () => {
    const failure = new Error("sync render failed")
    const reported = vi.spyOn(globalThis, "reportError").mockImplementation(() => {})
    const root = createRoot('<input value="ok">')
    const input = root.querySelector("input")!
    const controller = Mosaic(root, {
      state: { query: "" },
      elements: [{
        select: "input",
        sync: "query",
        attribute: ({ state }) => {
          if (state.query === "bad") throw failure
          return { "data-query": state.query }
        },
      }],
    })

    input.value = "bad"
    input.dispatchEvent(new Event("input", { bubbles: true }))
    await nextFrame()
    expect(reported).toHaveBeenCalledExactlyOnceWith(failure)
    assert.equal(controller.getState().query, "bad")

    input.value = "recovered"
    input.dispatchEvent(new Event("input", { bubbles: true }))
    await nextFrame()
    assert.equal(input.getAttribute("data-query"), "recovered")
    assert.equal(reported.mock.calls.length, 1)
  })
})
