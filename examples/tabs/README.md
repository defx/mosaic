# Tabs

The example implements horizontal tabs with automatic activation. Provide a
labelled `role="tablist"`, native `button type="button" role="tab"` controls, and
one `role="tabpanel"` per tab, paired in document order. Panels can have
`tabindex="0"` when their content has no suitable first focus target.

```ts
import { Mosaic } from "../../src/index.js";
import { Tabs } from "./tabs.js";

const root = document.querySelector<HTMLElement>("[data-tabs]")!;
const controller = Mosaic(root, Tabs({
  $$: (query) => [...root.querySelectorAll<HTMLElement>(query)],
}));
```

The first tab starts selected. ArrowLeft/ArrowRight move selection and focus,
wrapping at either end. Home/End select the first/last tab. Clicking nested label
content selects its tab. Only the selected tab has `tabindex="0"`; Tab follows
ordinary browser navigation into the selected panel's content.

Existing tab/panel IDs are retained, and missing IDs are generated once. The
configuration writes reciprocal `aria-controls` and `aria-labelledby` attributes,
`aria-selected`, and panel `hidden` values. Destroy the controller on removal.
The example expects a fixed, matching tab/panel collection and horizontal layout.
