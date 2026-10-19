import { afterEach, assert, it, vi } from "vitest"
import { Mosaic } from "../src/index.js"
import { nextFrame } from "./helpers/browser.js"

const controllers: { destroy(): void }[] = []
const roots: Element[] = []
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

it.each([
  ['<input value="initial">', "input"],
  ['<textarea>initial</textarea>', "textarea"],
  ['<select><option value="">Choose</option><option selected value="initial">Initial</option></select>', "select"],
])("uses the DOM initial value and supports string values for %s", async (html, select) => {
  const node = root(html + "<output></output>")
  const control = node.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(select)!
  const observed: string[] = []
  const controller = track(Mosaic(node, {
    state: { value: "configured" },
    actions: { clear: (state) => ({ ...state, value: "" }) },
    elements: [
      { select, sync: "value", on: { input: ({ state, getState }) => {
        assert.equal(state.value, getState().value)
        observed.push(state.value)
      } } },
      { select: "output", text: ({ state }) => state.value },
    ],
  }))
  assert.equal(controller.getState().value, "initial")
  assert.equal(node.querySelector("output")!.textContent, "initial")
  control.value = ""
  control.dispatchEvent(new Event("input"))
  assert.deepEqual(observed, [""])
  assert.equal(controller.getState().value, "")
  await nextFrame()
  assert.equal(node.querySelector("output")!.textContent, "")
  await controller.dispatch("clear")
  assert.equal(control.value, "")
})

it("initialises shared controls from the first match and mirrors typing and programmatic clearing", async () => {
  const node = root('<input value="first"><input value="second"><textarea>third</textarea>')
  const controls = [...node.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")]
  const observed: string[] = []
  const controller = track(Mosaic(node, {
    state: { value: "configured" },
    actions: { clear: (state) => ({ ...state, value: "" }) },
    elements: [{ select: "input, textarea", sync: "value", on: { input: ({ state }) => { observed.push(state.value) } } }],
  }))
  assert.equal(controller.getState().value, "first")
  assert.deepEqual(controls.map((control) => control.value), ["first", "first", "first"])
  controls[1].value = "typed"
  controls[1].dispatchEvent(new Event("input"))
  assert.deepEqual(observed, ["typed"])
  await nextFrame()
  assert.deepEqual(controls.map((control) => control.value), ["typed", "typed", "typed"])
  await controller.dispatch("clear")
  assert.deepEqual(controls.map((control) => control.value), ["", "", ""])
})

it("uses binding order for shared keys and initialises different keys independently", () => {
  const node = root('<input id="early" value="early"><input id="later" value="later"><textarea>other</textarea>')
  const controller = track(Mosaic(node, {
    state: { value: "configured", other: "configured" },
    elements: [
      { select: "#later", sync: "value" },
      { select: "#early", sync: "value" },
      { select: "textarea", sync: "other" },
    ],
  }))
  assert.deepEqual(controller.getState(), { value: "later", other: "other" })
  assert.equal(node.querySelector<HTMLInputElement>("#early")!.value, "later")
})

it("updates sync before input action shorthand runs", async () => {
  const node = root('<input value="initial"><output></output>')
  const controller = track(Mosaic(node, {
    state: { value: "", observed: "" },
    actions: { record: (state) => ({ ...state, observed: state.value }) },
    elements: [
      { select: "input", sync: "value", on: { input: "record" } },
      { select: "output", text: ({ state }) => state.observed },
    ],
  }))
  const input = node.querySelector("input")!
  input.value = "typed"
  input.dispatchEvent(new Event("input"))
  assert.equal(controller.getState().observed, "typed")
  await nextFrame()
  assert.equal(node.querySelector("output")!.textContent, "typed")
})

it("avoids redundant value assignments and preserves the typing selection", async () => {
  const node = root('<input value="initial">')
  const input = node.querySelector("input")!
  const setter = vi.spyOn(input, "value", "set")
  const controller = track(Mosaic(node, {
    state: { value: "configured" },
    actions: { change: (state, value: string) => ({ ...state, value }) },
    elements: [{ select: "input", sync: "value" }],
  }))
  assert.equal(setter.mock.calls.length, 0)
  await controller.dispatch("change", "initial")
  assert.equal(setter.mock.calls.length, 0)
  input.value = "typing"
  input.setSelectionRange(2, 2)
  input.dispatchEvent(new InputEvent("input", { data: "typing" }))
  await nextFrame()
  assert.equal(setter.mock.calls.length, 1)
  assert.equal(input.selectionStart, 2)
  await controller.dispatch("change", "")
  assert.equal(setter.mock.calls.length, 2)
  assert.equal(input.value, "")
})

it("does not overwrite composing controls and commits their final DOM value on compositionend", async () => {
  const node = root('<input value="initial"><input value="peer"><output></output>')
  const [input, peer] = node.querySelectorAll("input")
  const controller = track(Mosaic(node, {
    state: { value: "" },
    actions: { change: (state, value: string) => ({ ...state, value }) },
    elements: [
      { select: "input", sync: "value" },
      { select: "output", text: ({ state }) => state.value },
    ],
  }))
  input.dispatchEvent(new CompositionEvent("compositionstart"))
  input.value = "に"
  const setter = vi.spyOn(input, "value", "set")
  input.dispatchEvent(new InputEvent("input", { data: "に", isComposing: true }))
  assert.equal(controller.getState().value, "に")
  await nextFrame()
  assert.equal(peer.value, "に")
  await controller.dispatch("change", "external")
  assert.equal(input.value, "に")
  assert.equal(peer.value, "external")
  assert.equal(setter.mock.calls.length, 0)

  input.value = "日本"
  input.dispatchEvent(new CompositionEvent("compositionend", { data: "日本" }))
  assert.equal(controller.getState().value, "日本")
  await nextFrame()
  assert.equal(peer.value, "日本")
  assert.equal(node.querySelector("output")!.textContent, "日本")
  assert.equal(setter.mock.calls.length, 1)
  await controller.dispatch("change", "")
  assert.equal(input.value, "")
  assert.equal(peer.value, "")
})

it("tracks simultaneous composition per control and removes composition listeners on destroy", async () => {
  const node = root('<input value="first"><input value="second">')
  const [first, second] = node.querySelectorAll("input")
  const controller = track(Mosaic(node, {
    state: { value: "" },
    actions: { change: (state, value: string) => ({ ...state, value }) },
    elements: [{ select: "input", sync: "value" }],
  }))
  for (const control of [first, second]) control.dispatchEvent(new CompositionEvent("compositionstart"))
  first.value = "first draft"
  second.value = "second draft"
  await controller.dispatch("change", "external")
  assert.equal(first.value, "first draft")
  assert.equal(second.value, "second draft")
  first.dispatchEvent(new CompositionEvent("compositionend"))
  await nextFrame()
  assert.equal(second.value, "second draft")
  controller.destroy()
  second.dispatchEvent(new CompositionEvent("compositionend"))
  assert.equal(controller.getState().value, "first draft")
  const replacement = track(Mosaic(node, { state: { value: "" }, elements: [{ select: "input", sync: "value" }] }))
  assert.equal(replacement.getState().value, "first draft")
  assert.equal(second.value, "first draft")
})

it.each(['<input type="checkbox">', '<input type="radio">', '<input type="file">', '<select multiple></select>', '<div></div>'])("rejects unsupported sync targets: %s", (html) => {
  const node = root(html)
  assert.throws(() => Mosaic(node, { state: { value: "" }, elements: [{ select: "*", sync: "value" }] }), TypeError)
})

it("initialises sync before consumer input handlers in earlier bindings", () => {
  const node = root('<input value="initial">')
  const observed: string[] = []
  const controller = track(Mosaic(node, {
    state: { value: "", unmatched: "retained" },
    elements: [
      { select: "input", on: { input: ({ state }) => { observed.push(state.value) } } },
      { select: "input", sync: "value" },
      { select: ".missing", sync: "unmatched" },
    ],
  }))
  const input = node.querySelector("input")!
  input.value = "typed"
  input.dispatchEvent(new Event("input"))
  assert.deepEqual(observed, ["typed"])
  assert.equal(controller.getState().unmatched, "retained")
})
