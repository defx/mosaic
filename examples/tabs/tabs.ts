import type { MosaicConfig } from "../../src/index.js"
import type { ExampleContext } from "../types.js"

interface TabsState {
  selectedTab: number
  numTabs: number
}

const TABS = `button[role="tab"]`

export const Tabs = ({ $$ }: Pick<ExampleContext, "$$">) => {
  const actions = {
    selectNextTab: (state: TabsState) => {
      const { selectedTab, numTabs } = state
      return {
        ...state,
        selectedTab: selectedTab === numTabs - 1 ? 0 : selectedTab + 1,
      }
    },
    selectPreviousTab: (state: TabsState) => {
      const { selectedTab, numTabs } = state
      return {
        ...state,
        selectedTab: selectedTab === 0 ? numTabs - 1 : selectedTab - 1,
      }
    },
    selectFirstTab: (state: TabsState) => {
      return { ...state, selectedTab: 0 }
    },
    selectLastTab: (state: TabsState) => {
      return {
        ...state,
        selectedTab: state.numTabs - 1,
      }
    },
    selectTab: (state: TabsState, i: number) => {
      return {
        ...state,
        selectedTab: i,
      }
    },
  }

  const config: MosaicConfig<TabsState, typeof actions> = {
    state: {
      selectedTab: 0,
      numTabs: $$(TABS).length,
    },
    actions,
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
  return config
}
