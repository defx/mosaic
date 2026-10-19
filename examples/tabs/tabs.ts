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
        attribute: ({ state, index: i }) => ({
          "aria-selected": String(i === state.selectedTab),
          "tabindex": i === state.selectedTab ? null : -1,
        }),
        on: {
          keydown: ({ event, dispatch }) => {
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
          },
          click: ({ dispatch, index: i }) => {
            dispatch("selectTab", i)
          },
        },
      },
      {
        select: `[role="tabpanel"]`,
        attribute: ({ state, index: i }) => ({
          hidden: i !== state.selectedTab,
        }),
      },
    ],
  }
  return config
}
