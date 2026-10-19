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
      togglePanel: (state, i) => ({
        ...state,
        openPanel: state.openPanel === i ? -1 : i,
      }),
    },
    elements: [
      {
        selectAll: "button[accordion-toggle]",
        attribute: (state, i) => ({
          id: `trigger_${id}_${i}`,
          ariaControls: `panel_${id}_${i}`,
          ariaExpanded: state.openPanel === i,
        }),
        on: {
          click: "togglePanel",
        },
      },
      {
        selectAll: "[accordion-panel]",
        attribute: (state, i) => ({
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
`getState`, and `subscribe`. Dispatch actions to update state.

```js
const unsubscribe = controller.subscribe((state) => {
  console.log(state.openPanel);
});

await controller.dispatch("togglePanel", 1);
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
passes a numeric DOM index; use a callback to supply a different payload.

