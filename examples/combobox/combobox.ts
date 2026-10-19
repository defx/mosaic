import { Mosaic, type Controller, type MosaicConfig } from "../../src/index.js"
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
    },
    actions,
    elements: [
      {
        select: "input[type=text]",
        attribute: ({ state: {
          filteredOptions = [],
          selectedOption,
          listboxOpen,
        } }) => ({
          "aria-autocomplete": "list",
          "aria-expanded": String(listboxOpen),
          "aria-controls": listBoxId,
          "aria-activedescendant": listboxOpen
            ? filteredOptions[selectedOption]?.id || ""
            : "",
          role: "combobox",
        }),
        sync: "searchText",
        on: {
          input: ({ dispatch }) => {
            dispatch("onSearchInput")
          },
          keydown: async ({ event, dispatch, getState }) => {
            if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
            switch (event.key) {
              case "Tab":
                await dispatch("replaceSearchTextWithSelectedOption")
                break
              case "Enter":
                if (!getState().listboxOpen) return
                event.preventDefault()
                await dispatch("replaceSearchTextWithSelectedOption")
                break
              case "Down":
              case "ArrowDown":
                event.preventDefault()
                dispatch("openListbox")
                await dispatch("selectNextOption")
                scrollToSelectedOption({ getState })
                break
              case "Up":
              case "ArrowUp":
                event.preventDefault()
                dispatch("openListbox")
                await dispatch("selectPreviousOption")
                scrollToSelectedOption({ getState })
                break
              case "Esc":
              case "Escape":
                event.preventDefault()
                await dispatch(getState().listboxOpen ? "closeListbox" : "clearSearchInput")
                break
            }
          },
        },
      },
      {
        select: "[role=listbox]",
        attribute: ({ state }) => ({
          id: listBoxId,
          hidden: !state.listboxOpen,
        }),
      },
      {
        select: "[role=option]",
        attribute: ({ state: { filteredOptions, selectedOption, listboxOpen }, index: i }) => ({
          id: options[i].id,
          hidden: !filteredOptions.includes(options[i]),
          "aria-selected":
            String(listboxOpen && filteredOptions[selectedOption] === options[i]),
        }),
        on: {
          pointerdown: ({ event }) => event.preventDefault(),
          click: ({ dispatch, index: i }) => {
            dispatch("selectOption", i)
            dispatch("replaceSearchTextWithSelectedOption")
            rootNode.querySelector<HTMLInputElement>('input[type="text"]')!.focus()
          },
        },
      },
    ],
  }
  return config
}

export function mountComboBox(rootNode: HTMLElement) {
  const controller = Mosaic(rootNode, ComboBox({
    rootNode,
    $$: (query) => [...rootNode.querySelectorAll<HTMLElement>(query)],
  }))
  const onPointerUp = (event: PointerEvent) => {
    if (rootNode.contains(event.target as Node)) return
    void controller.dispatch("closeListbox").catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return
      reportError(error)
    })
  }
  const ownerDocument = rootNode.ownerDocument
  ownerDocument.addEventListener("pointerup", onPointerUp)
  return {
    ...controller,
    destroy() {
      ownerDocument.removeEventListener("pointerup", onPointerUp)
      controller.destroy()
    },
  }
}
