let counter = 0

export const ComboBox = ({ rootNode, $$ }) => {
  const id = counter++
  const listBoxId = `listbox_${id}`
  const options = $$('[role="option"]').map((node, i) => ({
    id: node.id || `option_${id}_${i}`,
    value: node.textContent.trim(),
  }))
  const filterOptions = (searchText) =>
    options.filter(({ value }) =>
      value.toLowerCase().startsWith(searchText.toLowerCase())
    )
  const scrollToSelectedOption = ({ getState }) => {
    const { selectedOption } = getState()
    $$('[role="option"]:not([hidden])')[selectedOption]?.scrollIntoView()
  }

  return {
    state: {
      searchText: "",
      selectedOption: -1,
      listboxOpen: false,
      filteredOptions: options,
      pointerOver: false,
    },
    actions: {
      pointerOver: (state) => ({ ...state, pointerOver: true }),
      pointerOut: (state) => ({ ...state, pointerOver: false }),
      replaceSearchTextWithSelectedOption: (state) => {
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
      clearSearchInput: (state) => ({
        ...state,
        searchText: "",
        selectedOption: -1,
        filteredOptions: options,
        listboxOpen: false,
      }),
      openListbox: (state) => ({
        ...state,
        listboxOpen: true,
      }),
      closeListbox: (state) => ({
        ...state,
        listboxOpen: false,
        selectedOption: -1,
      }),
      selectOption: (state, i) => ({
        ...state,
        selectedOption: state.filteredOptions.indexOf(options[i]),
      }),
      selectNextOption: (state) => {
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
      selectPreviousOption: (state) => {
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
      clearSelectedOption: (state) => ({ ...state, selectedOption: -1 }),
      onSearchInput: (state) => {
        return {
          ...state,
          selectedOption: -1,
          listboxOpen: true,
          filteredOptions: filterOptions(state.searchText),
        }
      },
    },
    elements: [
      {
        select: ":global(body)",
        on: {
          pointerup: (e, { getState, dispatch }) => {
            if (rootNode.contains(e.target)) return
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
            rootNode.querySelector('input[type="text"]').focus()
          },
        },
      },
    ],
  }
}
