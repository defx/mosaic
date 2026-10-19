import type { MosaicConfig } from "../../src/index.js"

interface AccordionState {
  openPanel: number
}

let counter = 0

export const Accordion = () => {
  const id = counter++
  const actions = {
    togglePanel: (state: AccordionState, i: number) => ({
      ...state,
      openPanel: state.openPanel === i ? -1 : i,
    }),
  }

  const config: MosaicConfig<AccordionState, typeof actions> = {
    state: {
      openPanel: 0,
    },
    actions,
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
          role: "region",
        }),
      },
    ],
  }
  return config
}
