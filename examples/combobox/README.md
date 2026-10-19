# Combobox

The combobox for choosing the name of a US state or territory illustrates the Combobox Pattern with autocomplete behavior known as _list autocomplete with manual selection_. If the user types one or more characters in the edit box and the typed characters match the beginning of the name of one or more states or territories, a listbox popup appears containing the matching names. When the listbox appears, a suggested name is not automatically selected. Thus, after typing, if the user tabs or clicks out of the combobox without choosing a value from the listbox, the typed string becomes the value of the combobox. Note that this implementation enables users to input the name of a state or territory, but it does not prevent input of any other arbitrary value.

## Option rendering

The example creates all option nodes before calling Mosaic. The behaviour reads
their labels from the DOM and filters them with `hidden`, preserving their
identity and order. IDs are preserved when supplied or generated once per instance.
Keyboard navigation and selection operate on the matching options only.

## Todo

- combobox button
