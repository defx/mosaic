# Combobox

The example provides an editable, single-select combobox with case-insensitive
prefix filtering. It accepts free text; a suggestion is committed only when the
user selects one. Labels and option text come from the existing DOM.

Provide a labelled `input type="text"`, a labelled `role="listbox"`, and its fixed
`role="option"` elements inside the mounting root. Create option nodes before
mounting. Existing option IDs are retained; missing IDs are generated once.
Ensure custom CSS preserves the hiding effect of `[hidden]` on options.

```ts
import { mountComboBox } from "./combobox.js";

const controller = mountComboBox(document.querySelector<HTMLElement>("[data-combobox]")!);
```

Typing opens the popup and filters by toggling `hidden`. ArrowDown/ArrowUp open it
and cycle matching options while focus stays in the input. Enter commits the
active suggestion and closes the popup. Tab commits the active suggestion, if
any, closes the popup, and allows normal focus departure. Escape closes an open
popup; pressing it while closed clears the query. Empty results preserve free text
and have no active descendant. Navigation keys are ignored during IME composition.

Clicking an option or its nested content commits it and returns focus to the input.
The mounting helper owns a document `pointerup` listener for outside dismissal.
Its `destroy()` removes that listener and destroys Mosaic's enhancement. Calling
`destroy()` is safe more than once.

Filtering and selection preserve every option node and its order. Changing the
option collection requires destroying and mounting again. This example has no
separate popup-toggle button.
