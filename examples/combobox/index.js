import { define } from "../mosaic.js"
import { ComboBox } from "./combobox.js"

const states =
  `Alabama,Alaska,American Samoa,Arizona,Arkansas,California,ColoradoConnecticut,Delaware,District of Columbia,Florida,Georgia,Guam,Hawaii,Idaho,Illinois,Indiana,Iowa,Kansas,Kentucky,Louisiana,Maine,Maryland,Massachusetts,Michigan,Minnesota,Mississippi,Missouri,Montana,Nebraska,Nevada,New Hampshire,New Jersey,New Mexico,New York,North Carolina,North Dakota,Northern Marianas Islands,Ohio,Oklahoma,Oregon,Pennsylvania,Puerto Rico,Rhode Island,South Carolina,South Dakota,Tennessee,Texas,Utah,Vermont,Virginia,Virgin Islands,Washington,West Virginia,Wisconsin,Wyoming`
    .split(",")
    .map((value) => ({ id: `option_${value}`, value }))

const optionTemplate = ({ id, value }) =>
  `<li id="${id}" role="option">${value}</li>`

define("combobox-example", () => {
  return ComboBox({
    optionTemplate,
    options: states,
  })
})
