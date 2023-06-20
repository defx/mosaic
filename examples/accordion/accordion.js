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
