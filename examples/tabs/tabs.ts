import type { MosaicConfig } from "../../src/index.js"
import type { ExampleContext } from "../types.js"

interface TabsState {
  selectedTab: number
  numTabs: number
}

const TABS = `button[role="tab"]`
let counter = 0

export const Tabs = ({ $$ }: Pick<ExampleContext, "$$">) => {
  const id = counter++
  const tabs = $$(TABS)
  const panels = $$('[role="tabpanel"]')
  const tabIds = tabs.map((tab, i) => tab.id || `tab_${id}_${i}`)
  const panelIds = panels.map((panel, i) => panel.id || `tabpanel_${id}_${i}`)
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
      numTabs: tabs.length,
    },
    actions,
    elements: [
      {
        select: TABS,
        attribute: ({ state, index: i }) => ({
          id: tabIds[i],
          "aria-controls": panelIds[i],
          "aria-selected": String(i === state.selectedTab),
          "tabindex": i === state.selectedTab ? 0 : -1,
        }),
        on: {
          keydown: async ({ event, dispatch, index }) => {
            if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return
            let next: number
            switch (event.key) {
              case "ArrowLeft": next = (index + tabs.length - 1) % tabs.length; break
              case "ArrowRight": next = (index + 1) % tabs.length; break
              case "Home": next = 0; break
              case "End": next = tabs.length - 1; break
              default: return
            }
            event.preventDefault()
            await dispatch("selectTab", next)
            tabs[next].focus()
          },
          click: async ({ dispatch, index }) => {
            await dispatch("selectTab", index)
            tabs[index].focus()
          },
        },
      },
      {
        select: `[role="tabpanel"]`,
        attribute: ({ state, index: i }) => ({
          id: panelIds[i],
          "aria-labelledby": tabIds[i],
          hidden: i !== state.selectedTab,
        }),
      },
    ],
  }
  return config
}
