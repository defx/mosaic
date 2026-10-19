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
const store = Mosaic(rootNode, Accordion());
```

Mosaic enhances the supplied node and returns its state store. It does not
register custom elements or require a particular root element type.

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
All test dependencies are installed locally; the runner does not load CDN scripts.

- `npm run test:watch` reruns tests as files change. Add `-- --browser.headless=false` to see the browser.
- `npm run test:coverage` prints source coverage and writes the HTML report to `coverage/index.html`.
- `node serveExamples.js` serves the examples at [localhost:1983](http://localhost:1983).

Mosaic binds behaviour to existing HTML; it does not render or reconcile lists.
The combobox example creates its fixed options before binding, then filters them
with `hidden` while preserving the nodes and their order.

The tabs test is a mounting placeholder; interaction coverage will be added in chunk 7.
