import { afterEach, assert, it, vi } from "vitest"
import { userEvent } from "vitest/browser"
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

it.each(['<input type="radio">', '<input type="file">', '<select multiple></select>', '<div></div>'])("rejects unsupported sync targets: %s", (html) => {
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

it.each([true, false])("initialises a checkbox from its live checked property: %s", (checked) => {
  const node = root('<input type="checkbox" value="custom" checked><output></output>')
  const input = node.querySelector("input")!
  input.checked = checked
  const controller = track(Mosaic(node, {
    state: { enabled: !checked },
    elements: [
      { select: "input", sync: "enabled" },
      { select: "output", text: ({ state }) => state.enabled },
    ],
  }))
  assert.strictEqual(controller.getState().enabled, checked)
  assert.equal(node.querySelector("output")!.textContent, String(checked))
  assert.equal(input.value, "custom")
})

it("updates checkbox state automatically through real pointer and Space activation", async () => {
  const node = root('<input type="checkbox"><output></output>')
  const input = node.querySelector("input")!
  const controller = track(Mosaic(node, {
    state: { enabled: false },
    elements: [
      { select: "input", sync: "enabled" },
      { select: "output", text: ({ state }) => state.enabled },
    ],
  }))
  await userEvent.click(input)
  assert.isTrue(controller.getState().enabled)
  await nextFrame()
  assert.equal(node.querySelector("output")!.textContent, "true")
  input.focus()
  await userEvent.keyboard(" ")
  assert.isFalse(controller.getState().enabled)
  await nextFrame()
  assert.equal(node.querySelector("output")!.textContent, "false")
})

it("updates before consumer input/change handlers, including change-only events", () => {
  const node = root('<input type="checkbox">')
  const input = node.querySelector("input")!
  const observed: [string, boolean][] = []
  const controller = track(Mosaic(node, {
    state: { enabled: false },
    elements: [
      { select: "input", on: {
        input: ({ state, getState }) => {
          assert.strictEqual(state.enabled, getState().enabled)
          observed.push(["input", state.enabled])
        },
        change: ({ state }) => { observed.push(["change", state.enabled]) },
      } },
      { select: "input", sync: "enabled" },
    ],
  }))
  input.checked = true
  input.dispatchEvent(new Event("change"))
  assert.isTrue(controller.getState().enabled)
  input.checked = false
  input.dispatchEvent(new Event("input"))
  input.dispatchEvent(new Event("change"))
  assert.deepEqual(observed, [["change", true], ["input", false], ["change", false]])
})

it("writes programmatic checkbox updates without redundant assignments or publications", async () => {
  const node = root('<input type="checkbox" value="custom">')
  const input = node.querySelector("input")!
  input.indeterminate = true
  const setter = vi.spyOn(input, "checked", "set")
  const controller = track(Mosaic(node, {
    state: { enabled: true },
    actions: { change: (state, enabled: boolean) => ({ ...state, enabled }) },
    elements: [{ select: "input", sync: "enabled" }],
  }))
  const subscriber = vi.fn()
  controller.subscribe(subscriber)
  assert.equal(setter.mock.calls.length, 0)
  await controller.dispatch("change", true)
  assert.isTrue(input.checked)
  assert.equal(setter.mock.calls.length, 1)
  await controller.dispatch("change", true)
  assert.equal(setter.mock.calls.length, 1)
  const publications = subscriber.mock.calls.length
  input.dispatchEvent(new Event("input"))
  input.dispatchEvent(new Event("change"))
  await nextFrame()
  assert.equal(subscriber.mock.calls.length, publications)
  await controller.dispatch("change", false)
  assert.isFalse(input.checked)
  assert.equal(setter.mock.calls.length, 2)
  assert.equal(input.value, "custom")
  assert.isTrue(input.indeterminate)
  assert.isFalse(input.hasAttribute("checked"))
})

it("mirrors one boolean across checkboxes using the first bound checkbox at mount", async () => {
  const node = root('<input id="first" type="checkbox" checked><input id="second" type="checkbox">')
  const [first, second] = node.querySelectorAll("input")
  const controller = track(Mosaic(node, {
    state: { enabled: true, unbound: true },
    actions: { change: (state, enabled: boolean) => ({ ...state, enabled }) },
    elements: [
      { select: "#second", sync: "enabled" },
      { select: "#first", sync: "enabled" },
      { select: ".missing", sync: "unbound" },
    ],
  }))
  assert.deepEqual(controller.getState(), { enabled: false, unbound: true })
  assert.isFalse(first.checked)
  assert.isFalse(second.checked)
  await userEvent.click(first)
  await nextFrame()
  assert.isTrue(second.checked)
  await controller.dispatch("change", false)
  assert.isFalse(first.checked)
  assert.isFalse(second.checked)
})

it("removes checkbox listeners on destruction and supports rebinding", async () => {
  const node = root('<input type="checkbox">')
  const input = node.querySelector("input")!
  const original = track(Mosaic(node, { state: { enabled: false }, elements: [{ select: "input", sync: "enabled" }] }))
  original.destroy()
  input.checked = true
  input.dispatchEvent(new Event("input"))
  input.dispatchEvent(new Event("change"))
  assert.isFalse(original.getState().enabled)
  const replacement = track(Mosaic(node, { state: { enabled: false }, elements: [{ select: "input", sync: "enabled" }] }))
  assert.isTrue(replacement.getState().enabled)
  await userEvent.click(input)
  assert.isFalse(replacement.getState().enabled)
  assert.isFalse(original.getState().enabled)
})

it.each(["checkbox-first", "text-first"])("rejects mixed checkbox/string controls on a shared key and cleans up: %s", (order) => {
  const node = root('<input id="checkbox" type="checkbox"><input id="text" value="text">')
  const selectors = order === "checkbox-first" ? ["#checkbox", "#text"] : ["#text", "#checkbox"]
  const config = {
    state: { value: false as string | boolean },
    elements: selectors.map((select) => ({ select, sync: "value" as const })),
  }
  const remove = vi.spyOn(node.querySelector(selectors[0])!, "removeEventListener")
  assert.throws(() => Mosaic(node, config), 'sync key "value" cannot mix checkbox and string controls')
  assert.isAtLeast(remove.mock.calls.length, 2)
})
