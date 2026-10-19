# Accordion

The example enhances existing buttons with `accordion-toggle` and panels with
`accordion-panel`, paired by document order. Use native `button type="button"`
triggers so Enter and Space activate them. Wrap each trigger in an appropriate
heading and provide one panel for each trigger.

```ts
import { Mosaic } from "../../src/index.js";
import { Accordion } from "./accordion.js";

const controller = Mosaic(document.querySelector("[data-accordion]")!, Accordion());
```

The first panel starts open. Clicking a trigger, including nested label content,
opens its panel and closes the others. Clicking the open trigger closes it.
Mosaic generates trigger/panel IDs and reciprocal `aria-controls` and
`aria-labelledby` attributes. Visibility uses `hidden`; presentation classes stay
in the markup. Destroy the controller when removing the enhancement.
