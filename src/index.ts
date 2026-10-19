import { initialise } from "./initialise.js"
import { Store } from "./store.js"
import type { ActionHandlers, Controller, MosaicConfig } from "./types.js"

export type {
  ActionHandlers,
  Attributes,
  Controller,
  Dispatch,
  ElementConfig,
  EventBindings,
  MosaicConfig,
  StoreConfig,
  StringKey,
} from "./types.js"

export const Mosaic = <
  State extends object = Record<string, never>,
  Actions extends ActionHandlers<State> = {},
>(
  node: Element,
  config: MosaicConfig<State, Actions>,
): Controller<State, Actions> => {
  const store = Store<State, Actions>({
    ...config,
  })

  initialise(node, config, store)

  return store.controller
}

export const $ = Mosaic
