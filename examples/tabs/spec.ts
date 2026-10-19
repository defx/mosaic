import { afterEach, assert, beforeEach, it } from "vitest"
import { userEvent } from "vitest/browser"
import { Mosaic } from "../../src/index.js"
import { nextFrame } from "../../test/helpers/browser.js"
import { Tabs } from "./tabs.js"
import markup from "./index.html?raw"

let root: HTMLElement
const controllers: { destroy(): void }[] = []
beforeEach(() => {
  const parsed = new DOMParser().parseFromString(markup, "text/html")
  root = document.importNode(parsed.querySelector<HTMLElement>("[data-tabs]")!, true)
  document.body.append(root)
})
afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.destroy())
  root.remove()
})
function mount(node = root) {
  const controller = Mosaic(node, Tabs({ $$: (query) => [...node.querySelectorAll<HTMLElement>(query)] }))
  controllers.push(controller)
  return controller
}
function tabs() { return [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')] }
function panels() { return [...root.querySelectorAll<HTMLElement>('[role="tabpanel"]')] }
function assertSelection(selected: number) {
  tabs().forEach((tab, i) => {
    assert.equal(tab.getAttribute("aria-selected"), String(i === selected))
    assert.equal(tab.tabIndex, i === selected ? 0 : -1)
    assert.equal(panels()[i].hidden, i !== selected)
    assert.equal(tab.getAttribute("aria-controls"), panels()[i].id)
    assert.equal(panels()[i].getAttribute("aria-labelledby"), tab.id)
  })
}

it("initialises all tabs and panels with reciprocal accessible relationships", () => {
  mount()
  assertSelection(0)
})

it("selects every tab when clicking nested content and moves focus", async () => {
  mount()
  for (let i = 0; i < tabs().length; i++) {
    await userEvent.click(tabs()[i].querySelector("span")!)
    await nextFrame()
    assertSelection(i)
    assert.strictEqual(document.activeElement, tabs()[i])
  }
})

it("moves keyboard selection and focus with wrapping, Home, and End", async () => {
  mount()
  tabs()[0].focus()
  for (const [key, selected] of [
    ["ArrowLeft", 3], ["ArrowRight", 0], ["ArrowRight", 1],
    ["End", 3], ["Home", 0],
  ] as const) {
    await userEvent.keyboard(`{${key}}`)
    await nextFrame()
    assertSelection(selected)
    assert.strictEqual(document.activeElement, tabs()[selected])
  }
  await userEvent.tab()
  assert.strictEqual(document.activeElement, panels()[0])
})

it("prevents defaults only for supported unmodified navigation keys", async () => {
  mount()
  tabs()[0].focus()
  const arrow = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true })
  tabs()[0].dispatchEvent(arrow)
  assert.isTrue(arrow.defaultPrevented)
  await nextFrame()
  for (const event of [
    new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true }),
    new KeyboardEvent("keydown", { key: "ArrowRight", ctrlKey: true, bubbles: true, cancelable: true }),
    new KeyboardEvent("keydown", { key: "Home", isComposing: true, bubbles: true, cancelable: true }),
  ]) {
    tabs()[1].dispatchEvent(event)
    assert.isFalse(event.defaultPrevented)
  }
  await nextFrame()
  assertSelection(1)
})

it("wraps programmatic navigation using the configured tab count", async () => {
  const controller = mount()
  await controller.dispatch("selectPreviousTab")
  assertSelection(3)
  await controller.dispatch("selectNextTab")
  assertSelection(0)
  await controller.dispatch("selectLastTab")
  assertSelection(3)
  await controller.dispatch("selectFirstTab")
  assertSelection(0)
})

it("generates stable tab and panel IDs when markup supplies none", async () => {
  tabs().forEach((tab) => tab.removeAttribute("id"))
  panels().forEach((panel) => panel.removeAttribute("id"))
  const controller = mount()
  const ids = [...tabs(), ...panels()].map((node) => node.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.isTrue(ids.every(Boolean))
  assertSelection(0)
  await controller.dispatch("selectLastTab")
  assertSelection(3)
  assert.deepEqual([...tabs(), ...panels()].map((node) => node.id), ids)
})
