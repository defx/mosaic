const TABS = `button[role="tab"]`
const PANELS = `[role="tabpanel"]`

const { $$ } = Store({
  selectedTab: 0,
  numTabs: $$(TABS).length,
  selectNextTab: (state) => {
    const { selectedTab, tabs } = state
    return {
      ...state,
      selectedTab: selectedTab === tabs.length - 1 ? 0 : selectedTab + 1,
    }
  },
  selectPreviousTab: (state) => {
    const { selectedTab, tabs } = state
    return {
      ...state,
      selectedTab: selectedTab === 0 ? tabs.length - 1 : selectedTab - 1,
    }
  },
  selectFirstTab: (state) => {
    return { ...state, selectedTab: 0 }
  },
  selectLastTab: (state) => {
    return {
      ...state,
      selectedTab: state.tabs.length - 1,
    }
  },
})

$$(TABS)
  .attr((state) => ({
    ariaSelected: i === state.selectedTab,
    tabIndex: i === state.selectedTab ? null : -1,
  }))
  .on("keydown", (event, { dispatch }) => {
    switch (event.key) {
      case "ArrowLeft":
        dispatch("selectPreviousTab")
        break

      case "ArrowRight":
        dispatch("selectNextTab")
        break

      case "Home":
        dispatch("selectFirstTab")
        break

      case "End":
        dispatch("selectLastTab")
        break

      default:
        break
    }
  })
  .on("click", (_, { dispatch }) => dispatch("selectTab"))

$$(PANELS).attr((state, i) => ({
  hidden: i !== state.selectedTab,
}))
