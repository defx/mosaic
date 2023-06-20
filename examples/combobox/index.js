import { define } from "/mosaic.js"
import { ComboBox } from "./combobox.js"

const states =
  "Alabama,Alaska,American Samoa,Arizona,Arkansas,California,Colorado,Conneticut,Delaware,District of Columbia"
    .split(",")
    .map((value) => ({ id: `option_${value}`, value }))

const optionTemplate = ({ id, value }) =>
  `<li id="${id}" role="option">${value}</li>`

define("combo-box", () => {
  return ComboBox({
    optionTemplate,
    options: states,
  })
})
