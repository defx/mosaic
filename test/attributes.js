import { Mosaic } from "../src/index.js"

describe("attribution", () => {
  let rootNode

  beforeEach(() => {
    rootNode = document.createElement("root-node")
    document.body.appendChild(rootNode)
  })

  afterEach(() => {
    document.body.removeChild(rootNode)
  })

  it("initialises the attributes", () => {
    rootNode.innerHTML = html`<button hidden>[+]</button>`

    Mosaic(rootNode, {
      elements: [
        {
          select: "button",
          attribute: () => ({
            hidden: false,
            ariaExpanded: false,
          }),
        },
      ],
    })

    assert.equal(rootNode.querySelector(`button`).hidden, false)
    assert.equal(
      rootNode.querySelector(`button`).getAttribute("aria-expanded"),
      "false"
    )
  })

  it("updates the attributes", async () => {
    rootNode.innerHTML = html`<button hidden>[+]</button>`

    Mosaic(rootNode, {
      state: {
        expanded: false,
      },
      actions: {
        toggle: (state) => ({
          expanded: !state.expanded,
        }),
      },
      elements: [
        {
          select: `button`,
          attribute: ({ expanded }) => ({
            hidden: false,
            ariaExpanded: expanded,
          }),
          on: {
            click: "toggle",
          },
        },
      ],
    })

    rootNode.querySelector(`button`).click()

    await nextFrame()

    assert.equal(
      rootNode.querySelector(`button`).getAttribute("aria-expanded"),
      "true"
    )
  })

  it("initialises the attribute of multiple matches", () => {
    rootNode.innerHTML = html`<button>[+]</button><button>[+]</button
      ><button>[+]</button><button>[+]</button>`
    Mosaic(rootNode, {
      elements: [
        {
          selectAll: "button",
          attribute: () => ({
            ariaExpanded: false,
          }),
        },
      ],
    })

    const buttons = [...rootNode.querySelectorAll(`button`)]

    assert.equal(buttons.length, 4)

    buttons.forEach((button) =>
      assert.equal(button.getAttribute("aria-expanded"), "false")
    )
  })
})
