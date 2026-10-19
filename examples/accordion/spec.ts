import { afterEach, assert, beforeEach, it } from "vitest"
import { userEvent } from "vitest/browser"
import { Mosaic } from "../../src/index.js"
import { nextFrame } from "../../test/helpers/browser.js"
import { Accordion } from "./accordion.js"
import markup from "./index.html?raw"

let root: HTMLElement
let controller: ReturnType<typeof mount>
function mount() { return Mosaic(root, Accordion()) }
beforeEach(() => {
  const parsed = new DOMParser().parseFromString(markup, "text/html")
  root = document.importNode(parsed.querySelector<HTMLElement>("[data-accordion]")!, true)
  document.body.append(root)
  controller = mount()
})
afterEach(() => { controller.destroy(); root.remove() })
function triggers() { return [...root.querySelectorAll<HTMLButtonElement>("[accordion-toggle]")] }
function panels() { return [...root.querySelectorAll<HTMLElement>("[accordion-panel]")] }
function assertOpen(selected: number) {
  triggers().forEach((trigger, i) => {
    assert.equal(trigger.getAttribute("aria-expanded"), String(i === selected))
    assert.equal(panels()[i].hidden, i !== selected)
    assert.equal(trigger.getAttribute("aria-controls"), panels()[i].id)
    assert.equal(panels()[i].getAttribute("aria-labelledby"), trigger.id)
    assert.equal(panels()[i].getAttribute("role"), "region")
  })
}

it("initialises every trigger and its panel", () => { assertOpen(0) })
it("opens and closes every panel through clicks on its trigger and nested content", async () => {
  for (let i = 0; i < triggers().length; i++) {
    if (controller.getState().openPanel === i) {
      await userEvent.click(triggers()[i])
      await nextFrame()
      assertOpen(-1)
    }
    await userEvent.click(triggers()[i])
    await nextFrame()
    assertOpen(i)
    await userEvent.click(triggers()[i].querySelector(".accordion-title")!)
    await nextFrame()
    assertOpen(-1)
    await userEvent.click(triggers()[i].querySelector(".accordion-title")!)
    await nextFrame()
    assertOpen(i)
  }
})
it("supports native Enter and Space activation", async () => {
  triggers()[1].focus()
  await userEvent.keyboard("{Enter}")
  await nextFrame()
  assertOpen(1)
  await userEvent.keyboard(" ")
  await nextFrame()
  assertOpen(-1)
})
