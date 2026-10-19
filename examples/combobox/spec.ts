import { afterEach, assert, beforeEach, describe, it } from "vitest"
import { Mosaic } from "../../src/index.js"
import { nextFrame } from "../../test/helpers/browser.js"
import { ComboBox } from "./combobox.js"

const states =
  `Alabama,Alaska,American Samoa,Arizona,Arkansas,California,ColoradoConnecticut,Delaware,District of Columbia,Florida,Georgia,Guam,Hawaii,Idaho,Illinois,Indiana,Iowa,Kansas,Kentucky,Louisiana,Maine,Maryland,Massachusetts,Michigan,Minnesota,Mississippi,Missouri,Montana,Nebraska,Nevada,New Hampshire,New Jersey,New Mexico,New York,North Carolina,North Dakota,Northern Marianas Islands,Ohio,Oklahoma,Oregon,Pennsylvania,Puerto Rico,Rhode Island,South Carolina,South Dakota,Tennessee,Texas,Utah,Vermont,Virginia,Virgin Islands,Washington,West Virginia,Wisconsin,Wyoming`
    .split(",")

describe("combo-box", () => {
  let rootNode: HTMLElement

  beforeEach(() => {
    rootNode = document.createElement("root-node")
    document.body.appendChild(rootNode)
  })

  afterEach(() => {
    document.body.removeChild(rootNode)
  })

  function mount(options = states) {
    rootNode.innerHTML = /* html */ `
    <style>
      [role="listbox"] [role="option"] {
        display: block;
      }
      [role="listbox"] [role="option"][hidden] {
        display: none;
      }
      [role="option"][aria-selected="true"],
      [role="listbox"] [role="option"]:hover {
        background-color: #def;
        color: #111;
      }
    </style>
    <div data-combobox>
      <label for="text-input">
          State
      </label>
      <input id="text-input" type="text" role="combobox">
      <ul aria-label="States" role="listbox">${options
        .map((value) => `<li role="option">${value}</li>`)
        .join("")}</ul>
    </div>`
    const node = rootNode.querySelector<HTMLElement>("[data-combobox]")!
    const optionNodes = [...node.querySelectorAll<HTMLElement>('[role="option"]')]
    Mosaic(
      node,
      ComboBox({
        rootNode: node,
        $$: (query) => [...node.querySelectorAll<HTMLElement>(query)],
      })
    )
    return optionNodes
  }

  const select = {
    get combobox() {
      return rootNode.querySelector<HTMLElement>("[data-combobox]")!
    },
    get input() {
      return rootNode.querySelector<HTMLInputElement>(`input[type=text][role=combobox]`)!
    },
    get listbox() {
      return rootNode.querySelector<HTMLElement>(`[role=listbox]`)!
    },
    get options() {
      return [
        ...rootNode.querySelectorAll<HTMLElement>(`[role=listbox] [role=option]:not([hidden])`),
      ]
    },
    get allOptions() {
      return [...rootNode.querySelectorAll<HTMLElement>(`[role=listbox] [role=option]`)]
    },
  }

  async function search(value: string) {
    select.input.value = value
    select.input.dispatchEvent(new Event("input", { bubbles: true }))
    await nextFrame()
  }

  async function press(key: string, type = "keyup") {
    select.input.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }))
    await nextFrame()
  }

  it(`sets [role="combobox"] on the input`, () => {
    mount()
    assert.equal(select.input.getAttribute("role"), "combobox")
  })

  it(`sets [aria-autocomplete="list"] on the input`, () => {
    mount()
    assert.equal(select.input.getAttribute("aria-autocomplete"), "list")
  })

  it(`sets [id] on the listbox`, () => {
    mount()
    assert.ok(select.listbox.id)
  })

  it(`sets [aria-controls] on the input`, () => {
    mount()
    assert.equal(select.input.getAttribute("aria-controls"), select.listbox.id)
  })

  it("labels the input", () => {
    mount()
    const { input } = select
    const { id } = input

    const hasLabel = id && document.querySelector(`label[for="${id}"]`)
    const isLabelled = input.hasAttribute("aria-label")
    const isLabelledBy =
      input.hasAttribute("aria-labelledby") &&
      document.getElementById(input.getAttribute("aria-labelledby")!)

    assert.ok(hasLabel || isLabelled || isLabelledBy)
  })

  it("labels the listbox", () => {
    mount()
    const { listbox } = select

    const isLabelled = listbox.hasAttribute("aria-label")
    assert.ok(isLabelled)
  })

  it(`manages expanded states`, async () => {
    mount()
    const { input, listbox } = select
    assert.equal(input.getAttribute("aria-expanded"), "false")
    assert.equal(listbox.hidden, true)
    input.value = "a"
    input.dispatchEvent(
      new Event("input", {
        bubbles: true,
      })
    )
    await nextFrame()
    assert.equal(input.getAttribute("aria-expanded"), "true")
    assert.equal(listbox.hidden, false)
  })

  it(`has no [aria-activedescendant]`, () => {
    mount()
    const { input } = select
    /* notOk used here to match null or "", either should be fine  */
    assert.notOk(input.getAttribute("aria-activedescendant"))
  })

  it(`opens the listbox when pressing the Down key on an empty input`, async () => {
    mount()
    const { input } = select

    input.focus()

    input.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "Down",
        bubbles: true,
      })
    )
    await nextFrame()
    assert.equal(input.getAttribute("aria-expanded"), "true")
    assert.equal(select.listbox.hidden, false)
  })

  it(`closes the listbox when pressing the Esc key if the listbox is open`, async () => {
    mount()
    const { input } = select

    input.value = "a"
    input.dispatchEvent(
      new Event("input", {
        bubbles: true,
      })
    )
    await nextFrame()
    assert.equal(input.getAttribute("aria-expanded"), "true")
    assert.equal(select.listbox.hidden, false)

    input.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "Esc",
        bubbles: true,
      })
    )
    await nextFrame()

    assert.equal(input.getAttribute("aria-expanded"), "false")
    assert.equal(input.value, "a")
    assert.equal(select.listbox.hidden, true)
  })

  it(`clears the input when pressing the Esc if the listbox is closed`, async () => {
    mount()
    const { input } = select

    input.value = "a"
    input.dispatchEvent(
      new Event("input", {
        bubbles: true,
      })
    )
    await nextFrame()

    assert.equal(input.getAttribute("aria-expanded"), "true")
    assert.equal(select.listbox.hidden, false)

    input.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "Esc",
        bubbles: true,
      })
    )
    input.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "Esc",
        bubbles: true,
      })
    )
    await nextFrame()

    assert.equal(input.getAttribute("aria-expanded"), "false")
    assert.equal(input.value, "")
    assert.equal(select.listbox.hidden, true)
  })

  it(`cycles the options when pressing the Down key`, async () => {
    mount()
    const { input } = select

    input.focus()
    input.value = "a"
    input.dispatchEvent(
      new Event("input", {
        bubbles: true,
      })
    )
    await nextFrame()

    const { options } = select

    assert.ok(options.length >= 2)

    for (const option of options) {
      input.dispatchEvent(
        new KeyboardEvent("keyup", {
          key: "Down",
          bubbles: true,
        })
      )
      await nextFrame()

      assert.equal(input.getAttribute("aria-activedescendant"), option.id)
      assert.equal(option.getAttribute("aria-selected"), "true")

      assert.equal(input, document.activeElement)

      assert.equal(
        select.listbox.querySelectorAll(`[aria-selected=true]`).length,
        1
      )
    }

    // now test that selection wraps around to the first option

    input.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "Down",
        bubbles: true,
      })
    )
    await nextFrame()

    assert.equal(input.getAttribute("aria-activedescendant"), options[0].id)
    assert.equal(options[0].getAttribute("aria-selected"), "true")

    assert.equal(input, document.activeElement)

    assert.equal(
      select.listbox.querySelectorAll(`[aria-selected=true]`).length,
      1
    )
  })

  it(`cycles the options when pressing the Up key`, async () => {
    mount()
    const { input } = select

    input.focus()
    input.value = "a"
    input.dispatchEvent(
      new Event("input", {
        bubbles: true,
      })
    )
    await nextFrame()

    const options = select.options.reverse()

    assert.ok(options.length >= 2)

    for (const option of options) {
      input.dispatchEvent(
        new KeyboardEvent("keyup", {
          key: "Up",
          bubbles: true,
        })
      )
      await nextFrame()

      assert.equal(input.getAttribute("aria-activedescendant"), option.id)
      assert.equal(option.getAttribute("aria-selected"), "true")

      assert.equal(input, document.activeElement)

      assert.equal(
        select.listbox.querySelectorAll(`[aria-selected=true]`).length,
        1
      )
    }

    // now test that selection wraps around to the last option

    input.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "Up",
        bubbles: true,
      })
    )
    await nextFrame()

    assert.equal(input.getAttribute("aria-activedescendant"), options[0].id)
    assert.equal(options[0].getAttribute("aria-selected"), "true")

    assert.equal(input, document.activeElement)

    assert.equal(
      select.listbox.querySelectorAll(`[aria-selected=true]`).length,
      1
    )
  })

  it("sets [role=option] on listbox elements", async () => {
    mount()
    const { input } = select
    input.value = "a"
    input.dispatchEvent(
      new Event("input", {
        bubbles: true,
      })
    )
    await nextFrame()

    assert.ok(select.options.length)
    for (const option of select.options) {
      assert.equal(option.getAttribute("role"), "option")
    }
  })

  it("replaces the input value with the selected option when the Enter key is pressed", async () => {
    mount()
    const { input } = select

    input.value = "a"
    input.dispatchEvent(
      new Event("input", {
        bubbles: true,
      })
    )
    await nextFrame()

    input.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "Down",
        bubbles: true,
      })
    )
    await nextFrame()

    const { textContent } = select.options[0]

    input.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "Enter",
        bubbles: true,
      })
    )
    await nextFrame()

    assert.equal(input.value, textContent)
  })

  it("replaces the input value with the selected option when the Tab key is pressed", async () => {
    mount()
    const { input } = select

    input.value = "a"
    input.dispatchEvent(
      new Event("input", {
        bubbles: true,
      })
    )
    await nextFrame()

    input.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "Down",
        bubbles: true,
      })
    )
    await nextFrame()

    const { textContent } = select.options[0]

    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
      })
    )
    await nextFrame()

    assert.equal(input.value, textContent)
  })

  it("hides nonmatching options without overriding their display styling", async () => {
    mount(["Alabama", "New York", "New Jersey", "Ohio"])

    await search("NEW")

    assert.deepEqual(select.options.map((node) => node.textContent), [
      "New York",
      "New Jersey",
    ])
    assert.lengthOf(select.allOptions, 4)
    assert.equal(getComputedStyle(select.allOptions[0]).display, "none")
    assert.equal(getComputedStyle(select.options[0]).display, "block")
  })

  it("preserves every option node and its order throughout filtering and selection", async () => {
    const originalNodes = mount(["Alabama", "New York", "New Jersey", "Ohio"])
    const ids = originalNodes.map((node) => node.id)
    const mutations: MutationRecord[] = []
    const observer = new MutationObserver((records) => mutations.push(...records))
    observer.observe(select.listbox, { childList: true, subtree: true })

    try {
      for (const value of ["new", "zzzz", "", "o"]) {
        await search(value)
      }
      await press("ArrowDown")
      await press("Enter")
      await press("Escape")

      const currentNodes = select.allOptions
      assert.lengthOf(currentNodes, originalNodes.length)
      currentNodes.forEach((node, i) => assert.strictEqual(node, originalNodes[i]))
      assert.deepEqual(currentNodes.map((node) => node.id), ids)
      assert.lengthOf([...mutations, ...observer.takeRecords()], 0)
    } finally {
      observer.disconnect()
    }
  })

  it("navigates, highlights, and scrolls only matching options", async () => {
    mount(["Alabama", "New York", "Ohio", "New Jersey"])
    select.input.focus()
    await search("new")
    const [first, last] = select.options
    const scrolled: HTMLElement[] = []
    select.allOptions.forEach((node) => {
      node.scrollIntoView = () => scrolled.push(node)
    })

    const steps: [string, HTMLElement][] = [
      ["ArrowDown", first],
      ["ArrowDown", last],
      ["ArrowDown", first],
      ["ArrowUp", last],
    ]
    for (const [key, expected] of steps) {
      await press(key)
      assert.equal(select.input.getAttribute("aria-activedescendant"), expected.id)
      assert.equal(expected.getAttribute("aria-selected"), "true")
      assert.strictEqual(scrolled.at(-1), expected)
      assert.equal(select.listbox.querySelectorAll('[aria-selected="true"]').length, 1)
    }
    assert.strictEqual(document.activeElement, select.input)
  })

  it("commits a filtered selection with Enter and closes the popup", async () => {
    mount(["Alabama", "New York", "New Jersey"])
    await search("new")
    await press("ArrowDown")
    await press("Enter")

    assert.equal(select.input.value, "New York")
    assert.equal(select.input.getAttribute("aria-expanded"), "false")
    assert.notOk(select.input.getAttribute("aria-activedescendant"))
    assert.isTrue(select.listbox.hidden)
    assert.equal(select.listbox.querySelectorAll('[aria-selected="true"]').length, 0)
  })

  it("selects a clicked option using its position in the filtered set", async () => {
    mount(["Alabama", "New York", "Ohio", "New Jersey"])
    await search("new")
    const option = select.options[1]
    const pointerdown = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
    })
    option.dispatchEvent(pointerdown)
    assert.isTrue(pointerdown.defaultPrevented)
    option.click()
    await nextFrame()

    assert.equal(select.input.value, "New Jersey")
    assert.isTrue(select.listbox.hidden)
    assert.strictEqual(document.activeElement, select.input)
  })

  it("clears the query and restores the fixed options without reopening the popup", async () => {
    mount(["Alabama", "New York", "Ohio"])
    await search("new")
    await press("ArrowDown")
    await press("Escape")
    assert.equal(select.input.value, "new")
    assert.notOk(select.input.getAttribute("aria-activedescendant"))
    await press("Escape")

    assert.equal(select.input.value, "")
    assert.lengthOf(select.options, 3)
    assert.isTrue(select.listbox.hidden)
  })

  it("resets the active option when the query changes", async () => {
    mount(["Alabama", "New York", "Ohio"])
    await search("new")
    await press("ArrowDown")
    assert.ok(select.input.getAttribute("aria-activedescendant"))
    await search("o")

    assert.notOk(select.input.getAttribute("aria-activedescendant"))
    assert.equal(select.listbox.querySelectorAll('[aria-selected="true"]').length, 0)
    await press("ArrowDown")
    assert.equal(select.input.getAttribute("aria-activedescendant"), select.options[0].id)
  })

  it("leaves unmatched text unchanged when navigating or committing with no results", async () => {
    mount(["Alabama", "New York", "Ohio"])
    await search("zzzz")

    for (const key of ["ArrowDown", "ArrowUp", "Enter"]) {
      await press(key)
      assert.lengthOf(select.options, 0)
      assert.lengthOf(select.allOptions, 3)
      assert.notOk(select.input.getAttribute("aria-activedescendant"))
      assert.equal(select.input.value, "zzzz")
    }
    await press("Tab", "keydown")
    assert.equal(select.input.value, "zzzz")
    assert.isTrue(select.listbox.hidden)
  })

  it("supports an initially empty option list", async () => {
    mount([])
    await press("ArrowDown")
    await press("ArrowUp")
    await press("Enter")

    assert.lengthOf(select.allOptions, 0)
    assert.equal(select.input.value, "")
    assert.notOk(select.input.getAttribute("aria-activedescendant"))
    assert.isTrue(select.listbox.hidden)
  })
})
