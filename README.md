# Mosaic

Mosaic adds state-driven behaviour to existing HTML. Describe actions and DOM
bindings in a configuration, then mount it on an element. The application owns
the markup and the enhancement's lifetime.

## Install and use

```sh
npm install mosaic
```

The package provides ESM JavaScript and TypeScript declarations. The example below
uses TypeScript; omit parameter type annotations in JavaScript.

```html
<div id="counter">
  <button type="button" data-increment>Add one</button>
  <button type="button" data-reset>Reset</button>
  <output aria-live="polite"></output>
</div>
```

```ts
import { Mosaic } from "mosaic";

const root = document.querySelector("#counter")!;
const controller = Mosaic(root, {
  state: { count: 0 },
  actions: {
    increment: (state, amount: number) => ({ ...state, count: state.count + amount }),
    reset: (state) => ({ ...state, count: 0 }),
  },
  elements: [
    { select: "[data-increment]", on: { click: ({ dispatch }) => dispatch("increment", 1) } },
    { select: "[data-reset]", on: { click: "reset" } },
    { select: "output", text: ({ state }) => state.count },
  ],
});

await controller.dispatch("increment", 2);
console.log(controller.getState().count); // 2, with the DOM updated

// When the application removes this enhancement:
controller.destroy();
```

`$` is an alias of `Mosaic`. A minified ESM entry is available at
`mosaic/dist/mosaic.min.js`, including for use through an ESM-compatible CDN.

## Configuration and selectors

`Mosaic(root, { state, actions, elements })` returns a controller. State and actions
are optional. Reducers receive `(state, payload)`, run synchronously, and return the
complete next state. State and action payload types are inferred from the config;
annotate payload parameters in TypeScript.

Each binding's `select` is an ordinary CSS selector. It binds **all matching
descendants** of the root, excluding the root itself. Use `:scope > button` for
direct children. Empty match sets are valid. Invalid CSS selectors throw at mount.

Matches are captured once, in document order. Later insertions, reordering, and
selector changes do not alter that collection or its indexes. Create the required
nodes before mounting. Destroy and remount an enhancement when its binding
collection needs to change.

An optional configuration callback, `getState(state)`, transforms the complete
state at initialization and after each write. It must be synchronous and return
the complete state. Read current state through the controller's `getState()`.

## Rendering

Rendering callbacks receive `{ state, element, index }`. `element` is the bound
element and `index` is its position in the captured collection for that binding.

| Field | Callback result | Effect |
| --- | --- | --- |
| `attribute` | Map of exact DOM attribute names to values | Sets or removes the returned attributes |
| `text` | String, number, boolean, `null`, or `undefined` | Writes plain text content |
| `class` | Map of class names to booleans | Toggles only returned class names |

```ts
{
  select: "button",
  attribute: ({ state }) => ({
    "aria-expanded": String(state.open),
    "data-status": state.status,
    disabled: state.busy,
    tabindex: 0,
  }),
  text: ({ state }) => state.label,
  class: ({ state }) => ({ active: state.open }),
}
```

Attribute names pass directly to the DOM: use `"aria-expanded"`, `tabindex`, or
`viewBox` as appropriate. Strings and numbers set values; `true` adds an empty
presence attribute; `false`, `null`, and `undefined` remove it. String-valued
booleans stay explicit strings, so use `"false"` for an ARIA false state.
Omitted attributes remain untouched.

`text` treats nullish results as empty text and replaces existing content,
including child elements. It writes text rather than parsing HTML.

`class` preserves unrelated classes. Names omitted from later callback results
also remain untouched; return `false` explicitly to remove a class. Nullish class
or attribute maps leave the element unchanged.

## Events

`on` maps DOM event names to callbacks or action names. Event callbacks receive
`{ state, element, index, event, dispatch, getState }`. `element` is the bound
element; `event.target` can be a descendant. `state` is a snapshot taken when the
listener runs, while `getState()` reads the latest committed state.

An action-name shorthand forwards the event context as its payload:

```ts
const config = {
  state: { selected: -1 },
  actions: {
    choose: (state: { selected: number }, { index }: { index: number }) => ({ ...state, selected: index }),
  },
  elements: [{ select: "button", on: { click: "choose" } }],
};
```

Listeners attach directly to the matched elements, including for non-bubbling
events such as `focus`. Normal DOM propagation applies: overlapping bindings and
nested enhancements can both handle a bubbling event. Selectors can also match
controls inside nested components. Choose selectors and propagation controls to
suit the application; Mosaic does not isolate nested bindings.

Handle root-level, document, and window events in consumer code. For example,
a document listener can check `root.contains(event.target)` before dispatching an
outside-dismissal action. Remove that listener in the application's cleanup.

Async event callbacks can await dispatches or perform application work. Rejected
handler promises are reported through the browser's `reportError`; dispatch
cancellations caused by destruction are ignored. Reducers and subscribers remain
synchronous contracts.

## Two-way values with sync

`sync` automatically keeps a control and a state field in sync. Updating state
from user input requires no action or event handler:

```ts
const controller = Mosaic(root, {
  state: { query: "", enabled: false },
  elements: [
    { select: "input.search", sync: "query" },
    { select: 'input[type="checkbox"]', sync: "enabled" },
  ],
});
```

Typing updates `query`; checking or unchecking the checkbox updates `enabled`.
String-valued inputs, textareas, and single-select controls use `.value` and require
string state fields. Checkboxes use `.checked` and require boolean state fields.
Checkbox `.value` and `.indeterminate` are left untouched. Radio buttons, file
inputs, and multi-selects cause a mount error.

At mount, the DOM wins over configured state. When controls share a key, the first
bound control supplies its initial value and the rest mirror it. Binding order
follows the `elements` array, then document order within each binding. Keys with
no matching controls retain their configured state. Multiple checkboxes sharing a
key mirror one boolean; they do not collect an array of selected values. Mixing
checkbox and string-value controls on the same key causes a mount error.

String controls update state on `input`; checkboxes update on both `input` and
`change`. Sync runs before consumer handlers for those events. Actions can also
update control values or checked states on the next render. Equal values are left
untouched to avoid redundant assignments and preserve cursor position.

Add `on.input` only when you want additional behaviour, such as filtering
suggestions. The handler sees state that `sync` has already updated:

```ts
{
  select: "input.search",
  sync: "query",
  on: { input: ({ dispatch }) => dispatch("filterSuggestions") },
}
```

Here `filterSuggestions` reads the current query from its reducer's state; it does
not need to copy the input value into state. Checkbox `on.change` handlers likewise
see the current boolean.

During IME composition, input events continue updating state, but Mosaic leaves
the composing string control's value untouched. Other controls sharing the key can
still update. On composition end, the final DOM value is committed and mirrored.
Numeric coercion, array-valued checkbox groups, radio groups, and automatic
form-reset handling belong in consumer code.

## State, completion, and cleanup

| Controller method | Contract |
| --- | --- |
| `dispatch(name, payload)` | Commits state synchronously; returns a promise for the batch's DOM update and subscriber notifications |
| `getState()` | Returns a shallow snapshot of current state |
| `subscribe(callback)` | Registers a synchronous callback and returns an idempotent unsubscribe function |
| `destroy()` | Removes owned listeners/subscriptions and cancels pending rendering |

Several actions before the next animation frame share one render of their final
state. Rendering precedes subscriber notifications. Awaiting dispatch observes the
updated DOM; it does not wait for browser paint. Actions dispatched during
publication commit immediately and render in a later frame with their own promises.

Subscriptions start with the next publication. New subscriptions created during
publication start on the following batch; removals take effect immediately.
Async subscriber work is not awaited. State snapshots are shallow: update nested
objects and arrays immutably so changes pass through actions and publication.

Unknown actions and reducer errors reject dispatch. Render or subscriber errors
reject every dispatch in the affected batch; remaining subscribers still run.
Multiple publication errors become an `AggregateError`. State stays committed,
and failed rendering can leave partially updated DOM. Later updates can recover.
Sync-only batches have no dispatch promise, so errors are reported using the
browser's `reportError`.

Destroy is idempotent and leaves the current DOM content in place. Pending and
subsequent dispatches reject with `AbortError`; `getState()` remains readable.
Subscribing after destruction returns a no-op unsubscribe function. The same nodes
can be mounted again. The application must clean up its own timers, listeners,
and asynchronous work and destroy enhancements before removing a route or region.

## Examples and development

The repository includes an [accordion](examples/accordion/README.md),
[tabs](examples/tabs/README.md), and a [combobox](examples/combobox/README.md).
These are application examples with their own markup contracts.

Use Node.js 22.12+, 24, or 26+ for development tooling:

```sh
npm ci
npm run test:install-browsers
npm test
npm run test:all
npm run typecheck
npm run test:package
```

- `npm run dev` serves [the examples](http://localhost:1983/examples/) through Vite.
- `npm test` runs Vitest Browser Mode in headless Chromium; `test:all` also runs Firefox and WebKit.
- `npm run test:watch` watches Chromium tests. Add `-- --browser.headless=false` to see the browser.
- `npm run test:coverage` writes Chromium source coverage to `coverage/index.html`.
- `npm run build` checks types and generates ESM bundles and declarations in `dist`.
- `npm run test:package` builds and packs locally, installs into a temporary consumer, checks ESM and type resolution, and runs browser consumption checks. It does not publish.
- `npm pack` builds the package through `prepack`. Publishing is a separate manual action.
