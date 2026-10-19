import { afterEach, assert, it } from "vitest"
import { Mosaic, type Attributes, type Classes, type TextValue } from "../src/index.js"

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
})

it("uses exact attribute names, including case-sensitive SVG names", () => {
  const node = root('<svg></svg><button></button>')
  track(Mosaic(node, { elements: [
    { select: "svg", attribute: () => ({ viewBox: "0 0 24 24", "data-kind": "icon" }) },
    { select: "button", attribute: () => ({ "aria-label": "Open", dataCamel: "literal", tabindex: -1 }) },
  ] }))
  const svg = node.querySelector("svg")!
  const button = node.querySelector("button")!
  assert.equal(svg.getAttribute("viewBox"), "0 0 24 24")
  assert.isFalse(svg.hasAttribute("view-box"))
  assert.equal(button.getAttribute("aria-label"), "Open")
  assert.equal(button.getAttribute("dataCamel"), "literal")
  assert.isFalse(button.hasAttribute("data-camel"))
  assert.equal(button.getAttribute("tabindex"), "-1")
})

it("sets strings and numbers, uses true for presence, and removes false or nullish attributes", async () => {
  const node = root('<button hidden disabled data-null="old" data-undefined="old"></button>')
  const controller = track(Mosaic(node, {
    state: { attributes: {
      hidden: false, disabled: true, "data-zero": 0, "data-empty": "",
      "data-null": null, "data-undefined": undefined,
      "aria-expanded": "false", "data-true": "true", "data-false": "false",
    } as Attributes },
    actions: { replace: (state, attributes: Attributes) => ({ ...state, attributes }) },
    elements: [{ select: "button", attribute: ({ state }) => state.attributes }],
  }))
  const button = node.querySelector("button")!
  assert.isFalse(button.hasAttribute("hidden"))
  assert.equal(button.getAttribute("disabled"), "")
  assert.equal(button.getAttribute("data-zero"), "0")
  assert.equal(button.getAttribute("data-empty"), "")
  assert.isFalse(button.hasAttribute("data-null"))
  assert.isFalse(button.hasAttribute("data-undefined"))
  assert.equal(button.getAttribute("aria-expanded"), "false")
  assert.equal(button.getAttribute("data-true"), "true")
  assert.equal(button.getAttribute("data-false"), "false")

  await controller.dispatch("replace", { disabled: false, "aria-expanded": true, hidden: "false" })
  assert.isFalse(button.hasAttribute("disabled"))
  assert.equal(button.getAttribute("aria-expanded"), "")
  assert.equal(button.getAttribute("hidden"), "false")
  await controller.dispatch("replace", { "aria-expanded": false, hidden: null, "data-zero": undefined })
  assert.isFalse(button.hasAttribute("aria-expanded"))
  assert.isFalse(button.hasAttribute("hidden"))
  assert.isFalse(button.hasAttribute("data-zero"))
})

it("writes text content with contexts and clears nullish results", async () => {
  const node = root('<output><b>Original</b></output><output></output>')
  const contexts: [Element, number][] = []
  const controller = track(Mosaic(node, {
    state: { value: "<b>Plain text</b>" as TextValue },
    actions: { change: (state, value: TextValue) => ({ ...state, value }) },
    elements: [{ select: "output", text: ({ state, element, index }) => {
      contexts.push([element, index])
      return state.value
    } }],
  }))
  const outputs = [...node.querySelectorAll("output")]
  assert.deepEqual(contexts, outputs.map((element, index) => [element, index]))
  assert.equal(outputs[0].textContent, "<b>Plain text</b>")
  assert.equal(outputs[0].children.length, 0)
  for (const [value, expected] of [[null, ""], [0, "0"], [undefined, ""], [false, "false"]] as [TextValue, string][]) {
    await controller.dispatch("change", value)
    outputs.forEach((output) => assert.equal(output.textContent, expected))
  }
})

it("toggles only returned class names and preserves unrelated and omitted classes", async () => {
  const node = root('<section class="layout theme stale"></section><section class="layout"></section>')
  const controller = track(Mosaic(node, {
    state: { classes: { active: true, stale: false } as Classes | null | undefined },
    actions: { change: (state, classes: Classes | null | undefined) => ({ ...state, classes }) },
    elements: [{ select: "section", class: ({ state, element, index }) => {
      assert.equal(element, node.children[index])
      return state.classes
    } }],
  }))
  const first = node.querySelector("section")!
  assert.equal(first.className, "layout theme active")
  first.classList.add("external")
  await controller.dispatch("change", { ready: true })
  assert.equal(first.className, "layout theme active external ready")
  await controller.dispatch("change", { active: false })
  assert.equal(first.className, "layout theme external ready")
  await controller.dispatch("change", null)
  await controller.dispatch("change", undefined)
  assert.equal(first.className, "layout theme external ready")
})
