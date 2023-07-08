import { define } from "../../src/define.js"
import { ComboBox } from "./combobox.js"

const states =
  `Alabama,Alaska,American Samoa,Arizona,Arkansas,California,ColoradoConnecticut,Delaware,District of Columbia,Florida,Georgia,Guam,Hawaii,Idaho,Illinois,Indiana,Iowa,Kansas,Kentucky,Louisiana,Maine,Maryland,Massachusetts,Michigan,Minnesota,Mississippi,Missouri,Montana,Nebraska,Nevada,New Hampshire,New Jersey,New Mexico,New York,North Carolina,North Dakota,Northern Marianas Islands,Ohio,Oklahoma,Oregon,Pennsylvania,Puerto Rico,Rhode Island,South Carolina,South Dakota,Tennessee,Texas,Utah,Vermont,Virginia,Virgin Islands,Washington,West Virginia,Wisconsin,Wyoming`
    .split(",")
    .map((value) => ({ id: `option_${value}`, value }))

const optionTemplate = ({ id, value }) =>
  `<li id="${id}" role="option">${value}</li>`

define("combobox-example", (api) => {
  return ComboBox(
    {
      optionTemplate,
      options: states,
    },
    api
  )
})

describe("combo-box", () => {
  let rootNode

  beforeEach(() => {
    rootNode = document.createElement("root-node")
    document.body.appendChild(rootNode)
  })

  afterEach(() => {
    document.body.removeChild(rootNode)
  })

  function mount() {
    rootNode.innerHTML = /* html */ `
    <style>
      combobox-example {
        display: block;
      }
      [role="option"][aria-selected="true"],
      [role="listbox"] [role="option"]:hover {
        background-color: #def;
        color: #111;
      }
    </style>
    <combobox-example>
      <label for="text-input">
          State
      </label>
      <input id="text-input" type="text" role="combobox">
      <ul aria-label="States" role="listbox"></ul>
    </combobox-example>`
  }

  const select = {
    get combobox() {
      return document.querySelector(`combobox-example`)
    },
    get input() {
      return document.querySelector(`input[type=text][role=combobox]`)
    },
    get listbox() {
      return document.querySelector(`[role=listbox]`)
    },
    get options() {
      return [...document.querySelectorAll(`[role=listbox] [role=option]`)]
    },
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
      document.getElementById(input.getAttribute("aria-labelledby"))

    assert.ok(hasLabel || isLabelled || isLabelledBy)
  })

  it("labels the listbox", () => {
    mount()
    const { listbox } = select

    // is labelledby a legitimate case here?

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
})
