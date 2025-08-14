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

## Install

### cdn

```js
import { define } from "https://unpkg.com/mosaic";
```

### npm

```sh
> npm i mosaic
```
