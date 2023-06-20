# Mosaic

## Codify UI behaviour with declarative configuration

🚧 Please kindly note that this project is a work in progress 🚧

[![npm](https://shields.io/npm/v/mosaic)](https://www.npmjs.com/package/mosaic)
[![gzip size](https://img.badgesize.io/https://unpkg.com/mosaic/dist/mosaic.min.js?compression=gzip&label=gzip)](https://unpkg.com/mosaic/dist/mosaic.min.js)

Mosaic's declarative configuration enables common UI behaviours to be reused effectively between different projects, ensuring a high level of performance and accessibility, whilst allowing developers to concentrate on the things that are particular to their specific business and project requirements (e.g., markup and styles)

## Example

The following configuration implements the Accordion pattern:

```js
let counter = 0

export const Accordion = () => {
  const id = counter++
  return {
    state: {
      openPanel: 0,
    },
    action: {
      togglePanel: (state, { index }) => ({
        ...state,
        openPanel: state.openPanel === index ? -1 : index,
      }),
    },
    elements: [
      {
        select: "button[accordion-toggle]",
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
        select: "[accordion-panel]",
        attribute: (state, i) => ({
          id: `panel_${id}_${i}`,
          ariaLabelledby: `trigger_${id}_${i}`,
          hidden: state.openPanel !== i,
        }),
      },
    ],
  }
}
```

As you can see from the example above, the behaviour is described separately from the markup. This separation of concerns allows the same behaviour to be reused with custom HTML markup and styles fitting the requirements of a specific project. The only restrictions upon markup are imposed by the _selectors_. Generally these selectors should just be custom attributes (e.g., `[accordion-panel]`) that aren't tied to any specific element type. In some cases however, more specificity may be employed to ensure accessibility (as seen with the `button[accordion-toggle]` selector in the example above).

## Install

### cdn

```js
import { define } from "https://unpkg.com/mosaic"
```

### npm

```sh
> npm i mosaic
```
