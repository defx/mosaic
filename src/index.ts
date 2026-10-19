import { initialise } from "./initialise.js"
import { Store } from "./store.js"
import type { ActionHandlers, Controller, MosaicConfig } from "./types.js"

export type {
  ActionHandlers,
  RenderContext,
  EventContext,
  Attributes,
  AttributeValue,
  Classes,
  TextValue,
  Controller,
  Dispatch,
  ElementConfig,
  EventBindings,
  MosaicConfig,
  StoreConfig,
  StringKey,
  SyncKey,
} from "./types.js"

export const Mosaic = <
  State extends object = Record<string, never>,
  Actions extends ActionHandlers<State> = {},
>(
  rootNode: Element,
  config: MosaicConfig<State, Actions>,
): Controller<State, Actions> => {
  const store = Store<State, Actions>({
    ...config,
  })

  try {
    initialise(rootNode, config, store)
  } catch (error) {
    store.controller.destroy()
    throw error
  }

  return store.controller
}

export const $ = Mosaic
