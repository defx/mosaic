import { $ } from "../src/index.js"

describe("navigation menu enhancement", () => {
  let rootNode

  beforeEach(() => {
    rootNode = document.createElement("root-node")
    document.body.appendChild(rootNode)
  })

  afterEach(() => {
    // document.body.removeChild(rootNode)
  })

  it("binds click event and manages classes", async () => {
    rootNode.innerHTML = html`
      <style>
        .hamburger {
          transform: translate(-100%, 0);
          transition: transform 0.3s ease-in-out;
        }

        .hamburger.open {
          transform: translate(0, 0);
        }
      </style>

      <button>[=]</button>
      <nav>
        <ul>
          <li>New In</li>
          <li>Bestsellers</li>
          <li>Skincare</li>
          <li>Makeup</li>
        </ul>
      </nav>
    `

    $(rootNode, {
      state: {
        menuIsOpen: false,
      },
      action: {
        toggleMenu: (state) => {
          return {
            ...state,
            menuIsOpen: !state.menuIsOpen,
          }
        },
      },
      elements: [
        {
          select: "button",
          on: {
            click: "toggleMenu",
          },
        },
        {
          select: "nav",
          attribute: ({ menuIsOpen }) => {
            return {
              class: {
                hamburger: true,
                open: menuIsOpen,
              },
            }
          },
        },
      ],
    })

    assert.ok(rootNode.querySelector("nav").classList.contains("hamburger"))
    assert.notOk(rootNode.querySelector("nav").classList.contains("open"))

    rootNode.querySelector(`button`).click()

    await nextFrame()

    assert.ok(rootNode.querySelector("nav").classList.contains("open"))
  })
})
