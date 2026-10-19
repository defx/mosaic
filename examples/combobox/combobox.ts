import type { Controller, MosaicConfig } from "../../src/index.js"
import type { ExampleContext } from "../types.js"

interface Option {
  id: string
  value: string
}

interface ComboboxState {
  searchText: string
  selectedOption: number
  listboxOpen: boolean
  filteredOptions: Option[]
  pointerOver: boolean
}

let counter = 0

export const ComboBox = ({ rootNode, $$ }: ExampleContext) => {
  const id = counter++
  const listBoxId = `listbox_${id}`
  const options = $$('[role="option"]').map((node, i) => ({
    id: node.id || `option_${id}_${i}`,
    value: node.textContent.trim(),
  }))
  const filterOptions = (searchText: string) =>
    options.filter(({ value }) =>
      value.toLowerCase().startsWith(searchText.toLowerCase())
    )
  const scrollToSelectedOption = ({ getState }: Pick<Controller<ComboboxState>, "getState">) => {
    const { selectedOption } = getState()
    $$('[role="option"]:not([hidden])')[selectedOption]?.scrollIntoView()
  }

  const actions = {
    pointerOver: (state: ComboboxState) => ({ ...state, pointerOver: true }),
    pointerOut: (state: ComboboxState) => ({ ...state, pointerOver: false }),
    replaceSearchTextWithSelectedOption: (state: ComboboxState) => {
      const { selectedOption, filteredOptions, searchText } = state

      const value = filteredOptions[selectedOption]?.value ?? searchText

      return {
        ...state,
        selectedOption: -1,
        searchText: value,
        filteredOptions: filterOptions(value),
        listboxOpen: false,
      }
    },
    clearSearchInput: (state: ComboboxState) => ({
      ...state,
      searchText: "",
      selectedOption: -1,
      filteredOptions: options,
      listboxOpen: false,
    }),
    openListbox: (state: ComboboxState) => ({
      ...state,
      listboxOpen: true,
    }),
    closeListbox: (state: ComboboxState) => ({
      ...state,
      listboxOpen: false,
      selectedOption: -1,
    }),
    selectOption: (state: ComboboxState, i: number) => ({
      ...state,
      selectedOption: state.filteredOptions.indexOf(options[i]),
    }),
    selectNextOption: (state: ComboboxState) => {
      const { filteredOptions, selectedOption } = state
      return {
        ...state,
        selectedOption:
          filteredOptions.length === 0
            ? -1
            : selectedOption < filteredOptions.length - 1
              ? selectedOption + 1
              : 0,
      }
    },
    selectPreviousOption: (state: ComboboxState) => {
      const { filteredOptions, selectedOption } = state
      return {
        ...state,
        selectedOption:
          filteredOptions.length === 0
            ? -1
            : selectedOption > 0
              ? selectedOption - 1
              : filteredOptions.length - 1,
      }
    },
    clearSelectedOption: (state: ComboboxState) => ({ ...state, selectedOption: -1 }),
    onSearchInput: (state: ComboboxState) => {
      return {
        ...state,
        selectedOption: -1,
        listboxOpen: true,
        filteredOptions: filterOptions(state.searchText),
      }
    },
  }

  const config: MosaicConfig<ComboboxState, typeof actions> = {
    state: {
      searchText: "",
      selectedOption: -1,
      listboxOpen: false,
      filteredOptions: options,
      pointerOver: false,
    },
    actions,
    elements: [
      {
        select: ":global(body)",
        on: {
          pointerup: (e, { getState, dispatch }) => {
            if (rootNode.contains(e.target as Node)) return
            setTimeout(() => {
              const { pointerOver } = getState()
              if (pointerOver === false) dispatch("closeListbox")
            }, 300)
          },
        },
      },
      {
        select: ":self",
        on: {
          pointerover: "pointerOver",
          pointerout: "pointerOut",
        },
      },
      {
        select: `input[type=text]`,
        attribute: ({
          filteredOptions = [],
          selectedOption,
          listboxOpen,
        }) => ({
          ariaAutocomplete: "list",
          ariaExpanded: listboxOpen,
          ariaControls: listBoxId,
          ariaActivedescendant: listboxOpen
            ? filteredOptions[selectedOption]?.id || ""
            : "",
          role: "combobox",
        }),
        sync: "searchText",
        on: {
          input: (_, store) => {
            store.dispatch("onSearchInput")
          },
          keydown: (event, store) => {
            const { key } = event

            switch (key) {
              case "Tab": {
                store.dispatch("replaceSearchTextWithSelectedOption")
                break
              }
            }
          },
          keyup: async (event, store) => {
            const { key } = event

            switch (key) {
              case "Enter": {
                store.dispatch("replaceSearchTextWithSelectedOption")
                break
              }
              case "Down":
              case "ArrowDown": {
                store.dispatch("openListbox")
                await store.dispatch("selectNextOption")
                scrollToSelectedOption(store)
                break
              }
              case "Up":
              case "ArrowUp": {
                store.dispatch("openListbox")
                await store.dispatch("selectPreviousOption")
                scrollToSelectedOption(store)
                break
              }
              case "Esc":
              case "Escape": {
                const { listboxOpen } = store.getState()

                if (listboxOpen) {
                  store.dispatch("closeListbox")
                } else {
                  store.dispatch("clearSearchInput")
                }
                break
              }
            }
          },
        },
      },
      {
        select: `[role=listbox]`,
        attribute: (state) => ({
          id: listBoxId,
          hidden: !state.listboxOpen,
        }),
      },
      {
        selectAll: "[role=option]",
        attribute: ({ filteredOptions, selectedOption, listboxOpen }, i) => ({
          id: options[i].id,
          hidden: !filteredOptions.includes(options[i]),
          ariaSelected:
            listboxOpen && filteredOptions[selectedOption] === options[i],
        }),
        on: {
          pointerdown: (event) => event.preventDefault(),
          click: (_, store, i) => {
            store.dispatch("selectOption", i)
            store.dispatch("replaceSearchTextWithSelectedOption")
            rootNode.querySelector<HTMLInputElement>('input[type="text"]')!.focus()
          },
        },
      },
    ],
  }
  return config
}
