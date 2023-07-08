const TABS = `button[role="tab"]`

export const Tabs = (_, { $$ }) => {
  return {
    state: {
      selectedTab: 0,
      numTabs: $$(TABS).length,
    },
    action: {
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
      selectTab: (state, i) => {
        return {
          ...state,
          selectedTab: i,
        }
      },
    },
    elements: [
      {
        select: TABS,
        attribute: (state, i) => ({
          ariaSelected: i === state.selectedTab,
          tabIndex: i === state.selectedTab ? null : -1,
        }),
        on: {
          keydown: (event, store) => {
            switch (event.key) {
              case "ArrowLeft":
                store.dispatch("selectPreviousTab")
                break

              case "ArrowRight":
                store.dispatch("selectNextTab")
                break

              case "Home":
                store.dispatch("selectFirstTab")
                break

              case "End":
                store.dispatch("selectLastTab")
                break

              default:
                break
            }
          },
          click: (_, store, i) => {
            store.dispatch("selectTab", i)
          },
        },
      },
      {
        select: `[role="tabpanel"]`,
        attribute: (state, i) => ({
          hidden: i !== state.selectedTab,
        }),
      },
    ],
  }
}
