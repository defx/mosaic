import { Mosaic } from "../../src/index.js"
import { ComboBox } from "./combobox.js"

const states =
  `Alabama,Alaska,American Samoa,Arizona,Arkansas,California,ColoradoConnecticut,Delaware,District of Columbia,Florida,Georgia,Guam,Hawaii,Idaho,Illinois,Indiana,Iowa,Kansas,Kentucky,Louisiana,Maine,Maryland,Massachusetts,Michigan,Minnesota,Mississippi,Missouri,Montana,Nebraska,Nevada,New Hampshire,New Jersey,New Mexico,New York,North Carolina,North Dakota,Northern Marianas Islands,Ohio,Oklahoma,Oregon,Pennsylvania,Puerto Rico,Rhode Island,South Carolina,South Dakota,Tennessee,Texas,Utah,Vermont,Virginia,Virgin Islands,Washington,West Virginia,Wisconsin,Wyoming`
    .split(",")

const rootNode = document.querySelector("[data-combobox]")
const listbox = rootNode.querySelector('[role="listbox"]')

// Create the fixed options once, before binding their behaviour.
states.forEach((value) => {
  const option = document.createElement("li")
  option.setAttribute("role", "option")
  option.textContent = value
  listbox.append(option)
})

Mosaic(
  rootNode,
  ComboBox({
    rootNode,
    $$: (query) => [...rootNode.querySelectorAll(query)],
  })
)
