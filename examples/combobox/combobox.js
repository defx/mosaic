let counter = 0

export const ComboBox =
  ({ optionTemplate, options = [] }) =>
  ({ rootNode, $$ }) => {
    const id = counter++
    const listBoxId = `listbox_${id}`

    return {
      state: {
        searchText: "",
        options,
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

          return {
            ...state,
            selectedOption: -1,
            searchText:
              selectedOption > -1
                ? filteredOptions[selectedOption].value
                : searchText,
            filteredOptions: [],
          }
        },
        clearSearchInput: (state) => ({
          ...state,
          searchText: "",
        }),
        openListbox: (state) => ({
          ...state,
          listboxOpen: true,
        }),
        closeListbox: (state) => ({
          ...state,
          listboxOpen: false,
        }),
        selectNextOption: (state) => {
          const { filteredOptions, selectedOption } = state
          return {
            ...state,
            selectedOption:
              selectedOption < filteredOptions.length - 1
                ? selectedOption + 1
                : 0,
          }
        },
        selectPreviousOption: (state) => {
          const { filteredOptions, selectedOption } = state
          return {
            ...state,
            selectedOption:
              selectedOption > 0
                ? selectedOption - 1
                : filteredOptions.length - 1,
          }
        },
        clearSelectedOption: (state) => ({ ...state, selectedOption: -1 }),
        onSearchInput: (state) => {
          const { options } = state
          const searchText = state.searchText.toLowerCase()

          return {
            ...state,
            selectedOption: -1,
            listboxOpen: true,
            filteredOptions: searchText.length
              ? options.filter(({ value }) =>
                  value.toLowerCase().startsWith(searchText)
                )
              : options,
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
            ariaActivedescendant: filteredOptions[selectedOption]?.id || "",
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
                  store.dispatch("closeListbox")
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
                  const { selectedOption = 0 } = store.getState()
                  $$(`[role="option"]`)[selectedOption]?.scrollIntoView()
                  break
                }
                case "Up":
                case "ArrowUp": {
                  store.dispatch("selectPreviousOption")
                  const { selectedOption = 0 } = store.getState()
                  $$(`[role="option"]`)[selectedOption]?.scrollIntoView()
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
          list: {
            select: "[role=option]",
            template: optionTemplate,
            from: "filteredOptions",
          },
        },
        {
          selectAll: "[role=option]",
          attribute: ({ selectedOption }, i) => {
            return {
              ariaSelected: selectedOption === i,
            }
          },
        },
      ],
    }
  }
