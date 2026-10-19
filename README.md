# Mosaic

## Accelerate your UI development

🚧 Please kindly note that this project is a work in progress. 🚧

## Mosaic allows authors to write once and run anywhere

Mosaic enables UI behaviour to be described using a combination of functional programming and declarative configuration, separating behaviour from presentation to ensure maximum reusability.

## Mosaic enables teams to focus on UI presentation

Get a head start on UI development by leveraging UI behaviour that is
highly performant, accessible, and fully tested straight out of the box, letting you focus on your project presentation.

[![npm](https://shields.io/npm/v/mosaic)](https://www.npmjs.com/package/mosaic)
[![gzip size](https://img.badgesize.io/https://unpkg.com/mosaic/dist/mosaic.min.js?compression=gzip&label=gzip)](https://unpkg.com/mosaic/dist/mosaic.min.js)

## Example

The following configuration implements the Accordion pattern:

```js
let counter = 0;

export const Accordion = () => {
  const id = counter++;
  return {
    state: {
      openPanel: 0,
    },
    actions: {
      togglePanel: (state, { index: i }) => ({
        ...state,
        openPanel: state.openPanel === i ? -1 : i,
      }),
    },
    elements: [
      {
        select: "button[accordion-toggle]",
        attribute: ({ state, index: i }) => ({
          id: `trigger_${id}_${i}`,
          ariaControls: `panel_${id}_${i}`,
          ariaExpanded: state.openPanel === i,
        }),
        on: {
          click: "togglePanel",
        },
      },
      {
        select: "[accordion-panel]",
        attribute: ({ state, index: i }) => ({
          id: `panel_${id}_${i}`,
          ariaLabelledby: `trigger_${id}_${i}`,
          hidden: state.openPanel !== i,
          role: "region",
        }),
      },
    ],
  };
};
```

Bind the configuration to an existing DOM node:

```js
import { Mosaic } from "mosaic";

const rootNode = document.querySelector("[data-accordion]");
const controller = Mosaic(rootNode, Accordion());
```

Mosaic enhances the supplied node and returns a controller with `dispatch`,
`getState`, `subscribe`, and `destroy`. Dispatch actions to update state.

```js
const unsubscribe = controller.subscribe((state) => {
  console.log(state.openPanel);
});

await controller.dispatch("togglePanel", { index: 1 });
// The DOM now reflects the completed batch.
unsubscribe();
```

Reducers update state synchronously, so `getState()` immediately returns the latest
state. Rendering and subscriber notifications are batched into the next animation
frame. Several actions before that frame share one render of their final state.
`dispatch` resolves after rendering and synchronous subscriber notifications finish;
it does not wait for browser paint. An action dispatched during publication updates
state immediately and renders in a later frame, with its own completion promise.

`getState()` returns a shallow snapshot. Update nested objects and arrays immutably.
Subscriptions begin with the next publication, after rendering, and return an
idempotent unsubscribe function. Asynchronous subscriber work is not awaited.

Unknown actions and reducer errors reject the dispatch promise. A render or
subscriber error rejects every dispatch promise in that batch; remaining
subscribers still run and later updates can recover. Multiple publication errors
are combined in an `AggregateError`. Committed state is retained after publication
errors, and failed rendering may leave the DOM partially updated. Errors from
`sync`-only batches, which have no dispatch promise, are reported through the
browser's `reportError` function.

## Selectors, events, and cleanup

Each binding's `select` is a CSS selector that matches every matching descendant
of the mounting root. Matches are captured once at mount; callback indexes follow
their original document order. An empty match set is valid. Later additions and
changes to selector membership do not change the captured bindings.

The mounting root itself is excluded. Use `:scope` in selectors to express
relationships to the root, such as `:scope > button` for direct children.
Handle root-level, document, or window events in consumer code—for example, an
outside-click listener can check `rootNode.contains(event.target)` before dispatching
an action. Remove consumer-owned listeners when disposing of the enhancement.

Rendering callbacks receive `{ state, element, index }`. Event callbacks receive
`{ state, element, index, event, dispatch, getState }`. `element` is the bound target;
`event.target` may be a descendant. `state` is a snapshot taken when the listener
runs; `getState()` reads the latest state after any actions dispatched by the handler.
An action name such as `on: { click: "togglePanel" }` forwards the whole event
context as the reducer's payload.

Listeners attach directly to matching elements and follow ordinary DOM event
propagation. With overlapping or nested bindings, a bubbling event can invoke
several listeners. Choose selectors and use event propagation controls to suit
your interface; nested components do not receive automatic event isolation.

Call `controller.destroy()` when the enhancement is no longer needed. Destruction
is idempotent: it removes Mosaic's listeners and subscriptions, cancels pending
rendering, and rejects pending or subsequent dispatches with `AbortError`.
`getState()` remains readable, and subscribing after destruction returns a no-op
unsubscribe function. Cleanup leaves the current DOM content in place. The same
nodes can then be bound to a new controller.

Promises returned by event handlers are observed: errors are reported through the
browser's `reportError`, while dispatch cancellations caused by destruction are
ignored. Consumer-created timers, listeners, and asynchronous work remain the
consumer's responsibility to clean up.

## Install

### cdn

```js
import { Mosaic } from "https://unpkg.com/mosaic";
```

### npm

```sh
> npm i mosaic
```

## Development and tests

Use Node.js 22 (22.12 or later), 24, or 26+ for the test tooling.

```sh
npm ci
npm run test:install-browsers
npm test
```

Tests run in headless Chromium through Vitest Browser Mode and Playwright.

- `npm run test:watch` reruns tests as files change. Add `-- --browser.headless=false` to see the browser.
- `npm run test:coverage` prints source coverage and writes the HTML report to `coverage/index.html`.
- `npm run typecheck` checks the library, examples, tests, and compile-only API contracts with strict TypeScript settings.
- `npm run dev` serves the examples through Vite at [localhost:1983/examples/](http://localhost:1983/examples/).
- `npm run build` type-checks, emits JavaScript and declarations, and builds the bundles. Package declarations are generated in `dist/types`.

TypeScript infers state and action names; annotate reducer
payloads such as `(state, amount: number) => ...`. Action-name event shorthand
passes the event context; use a callback to supply a different payload.

