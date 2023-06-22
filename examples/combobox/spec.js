import "./index.js"

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
      return document.querySelector(`[role="combobox"]`)
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

  it(`selects the option when pressing the Down key`, async () => {
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
    input.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "Down",
        bubbles: true,
      })
    )
    await nextFrame()

    assert.equal(
      input.getAttribute("aria-activedescendant"),
      select.options[0].id
    )
    assert.equal(select.options[0].getAttribute("aria-selected"), "true")

    assert.equal(input, document.activeElement)

    assert.equal(
      select.listbox.querySelectorAll(`[aria-selected=true]`).length,
      1
    )

    input.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "Down",
        bubbles: true,
      })
    )
    await nextFrame()

    assert.equal(
      input.getAttribute("aria-activedescendant"),
      select.options[1].id
    )
    assert.equal(select.options[1].getAttribute("aria-selected"), "true")

    assert.equal(input, document.activeElement)

    assert.equal(
      select.listbox.querySelectorAll(`[aria-selected=true]`).length,
      1
    )
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
    select.options.every((option) =>
      assert.equal(option.getAttribute("role"), "option")
    )
  })
})