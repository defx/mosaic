let counter = 0

export const ComboBox = ({ optionTemplate, options = [] }) => {
  const id = counter++
  const listBoxId = `listbox_${id}`

  return {
    state: {
      searchText: "",
      options,
      selectedOption: -1,
    },
    action: {
      setValue: (state) => {
        const { selectedOption, filteredOptions } = state

        return {
          ...state,
          selectedOption: -1,
          searchText: filteredOptions[selectedOption]?.value,
          filteredOptions: [],
        }
      },
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
          filteredOptions: searchText.length
            ? options.filter(({ value }) =>
                value.toLowerCase().startsWith(searchText)
              )
            : [],
        }
      },
    },
    elements: [
      {
        select: "input[type=text]",
        attribute: ({ filteredOptions = [], selectedOption }) => ({
          role: "combobox",
          ariaAutocomplete: "list",
          ariaExpanded: !!filteredOptions.length,
          ariaControls: listBoxId,
          ariaActivedescendant: filteredOptions[selectedOption]?.id || "",
        }),
        input: "searchText",
        on: {
          input: (_, store) => {
            store.dispatch("onSearchInput")
          },
          keyup: (event, store) => {
            if (event.ctrlKey || event.shiftKey) {
              return
            }

            const { options } = store.getState()
            if (!options?.length) return

            const { key } = event

            switch (key) {
              case "Enter": {
                store.dispatch("setValue")
                break
              }
              case "Down":
              case "ArrowDown": {
                store.dispatch("selectNextOption")
                break
              }
              case "Up":
              case "ArrowUp": {
                store.dispatch("selectPreviousOption")
                break
              }
            }
          },
        },
      },
      {
        select: `[role=listbox]`,
        attribute: () => ({
          id: listBoxId,
        }),
        list: {
          select: "[role=option]",
          template: optionTemplate,
          from: "filteredOptions",
        },
      },
      {
        select: "[role=option]",
        attribute: ({ selectedOption }, i) => {
          return {
            ariaSelected: selectedOption === i,
          }
        },
      },
    ],
  }
}
