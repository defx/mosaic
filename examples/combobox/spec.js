import "./index.js"

describe("combo-box", () => {
  let rootNode

  beforeEach(() => {
    rootNode = document.createElement("root-node")
    document.body.appendChild(rootNode)
  })

  afterEach(() => {
    // document.body.removeChild(rootNode)
  })

  function mount() {
    rootNode.innerHTML = /* html */ `
    <style>
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
        <div class="combobox combobox-list">
            <input id="text-input" type="text" name="searchInput">
            <ul aria-label="States" role="listbox">
            </ul>
        </div>
    </combobox-example>`
  }

  const select = {
    get combobox() {
      return document.querySelector(`combobox-example`)
    },
    get input() {
      return document.querySelector(`input[type=text]`)
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

  it(`places focus on the first option when pressing the Down key`, async () => {
    mount()
    const { input, options } = select
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
    assert.equal(input.getAttribute("aria-activedescendant"), options[0].id)
  })
})
