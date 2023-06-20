import { $ } from "../src/index.js"

describe("list sorting", () => {
  let rootNode

  beforeEach(() => {
    rootNode = document.createElement("root-node")
    document.body.appendChild(rootNode)
  })

  afterEach(() => {
    // document.body.removeChild(rootNode)
  })

  it("sorts the list", async () => {
    rootNode.innerHTML = html`
      <label for="sort">Sort by:</label>
      <select id="sort" name="sortBy">
        <option value="priceLowToHigh">Price (low - high)</option>
        <option value="priceHighToLow">Price (high - low)</option>
        <option value="rating">Rating</option>
      </select>
      <ul>
        <li id="f8g7r6d" data-price="5" data-rating="4.7">
          <p>£5</p>
        </li>
        <li id="afd56erg" data-price="14.99" data-rating="4.2">
          <p>£14.99</p>
        </li>
      </ul>
    `

    const sort = {
      priceLowToHigh: (a, b) => a.price - b.price,
      priceHighToLow: (a, b) => b.price - a.price,
    }

    $(rootNode, {
      getState: (state) => {
        return {
          ...state,
          products: state.products.sort(sort[state.sortBy]),
        }
      },
      elements: [
        {
          select: "select",
          input: "sortBy",
        },
        {
          select: "ul",
          list: {
            select: "li",
            from: "products",
          },
        },
      ],
    })

    rootNode.querySelector(`[id="sort"]`).value = "priceHighToLow"
    rootNode.querySelector(`[id="sort"]`).dispatchEvent(
      new Event("input", {
        bubbles: true,
      })
    )

    function prices() {
      return Array.from(rootNode.querySelectorAll(`[data-price]`))
        .map((el) => el.getAttribute("data-price"))
        .map((v) => +v)
    }

    await nextFrame()

    assert.deepEqual(prices(), [14.99, 5])

    rootNode.querySelector(`[id="sort"]`).value = "priceLowToHigh"
    rootNode.querySelector(`[id="sort"]`).dispatchEvent(
      new Event("input", {
        bubbles: true,
      })
    )

    await nextFrame()

    assert.deepEqual(prices(), [5, 14.99])
  })

  it("sorts the list with correct default", async () => {
    rootNode.innerHTML = html`
      <label for="sort">Sort by:</label>
      <select name="sortBy" id="sort">
        <option value="bestsellers">Bestsellers</option>
        <option value="priceLowToHigh" selected>Price (low - high)</option>
        <option value="priceHighToLow">Price (high - low)</option>
        <option value="rating">Rating</option>
      </select>
      <ul>
        <li id="afd56erg" data-price="14.99" data-rating="4.2">
          <p>14.99</p>
        </li>
        <li id="f8g7r6d" data-price="5" data-rating="4.7">
          <p>5</p>
        </li>
      </ul>
    `

    const sort = {
      priceLowToHigh: (a, b) => a.price - b.price,
      priceHighToLow: (a, b) => b.price - a.price,
    }

    $(rootNode, {
      getState: (state) => {
        return {
          ...state,
          products: state.products.sort(sort[state.sortBy]),
        }
      },
      elements: [
        {
          select: "select",
          input: "sortBy",
        },
        {
          select: "ul",
          list: {
            select: "li",
            from: "products",
          },
        },
      ],
    })

    function prices() {
      return Array.from(rootNode.querySelectorAll(`[data-price]`))
        .map((el) => el.getAttribute("data-price"))
        .map((v) => +v)
    }

    assert.deepEqual(prices(), [5, 14.99])
  })
})
