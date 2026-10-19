export type ActionHandlers<State extends object> = Record<
  string,
  (state: State, payload: never) => State
>

type Payload<Handler> = Handler extends (
  state: never,
  ...payload: infer Args
) => unknown
  ? Args
  : never

export type Dispatch<Actions> = <Name extends keyof Actions & string>(
  name: Name,
  ...payload: Payload<Actions[Name]>
) => Promise<void>

export interface Controller<State extends object, Actions = {}> {
  dispatch: Dispatch<Actions>
  getState(): State
  destroy(): void
  subscribe(callback: (state: State) => void): () => void
}

export type AttributeValue = string | number | boolean | null | undefined
export type Attributes = Record<string, AttributeValue>
export type TextValue = string | number | boolean | null | undefined
export type Classes = Record<string, boolean>

export type StringKey<State> = {
  [Key in keyof State]-?: State[Key] extends string ? Key : never
}[keyof State] & string

export type SyncKey<State> = {
  [Key in keyof State]-?: State[Key] extends string | boolean ? Key : never
}[keyof State] & string

export interface RenderContext<State extends object> {
  state: State
  element: Element
  index: number
}

export interface EventContext<State extends object, Actions = {}, E extends Event = Event> {
  state: State
  element: Element
  index: number
  event: E
  dispatch: Dispatch<Actions>
  getState(): State
}

type Events = HTMLElementEventMap

export type EventBindings<State extends object, Actions> = {
  [Name in keyof Events]?:
    | (keyof Actions & string)
    | ((context: EventContext<State, Actions, Events[Name]>) => void | Promise<void>)
}

export interface ElementConfig<State extends object, Actions = {}> {
  select: string
  attribute?: (context: RenderContext<State>) => Attributes | null | undefined
  text?: (context: RenderContext<State>) => TextValue
  class?: (context: RenderContext<State>) => Classes | null | undefined
  on?: EventBindings<State, Actions>
  sync?: SyncKey<State>
}

export interface StoreConfig<
  State extends object,
  Actions extends ActionHandlers<State> = {},
> {
  actions?: Actions & ActionHandlers<State>
  getState?: (state: State) => State
}

export interface MosaicConfig<
  State extends object,
  Actions extends ActionHandlers<State> = {},
> extends StoreConfig<State, Actions> {
  state?: State
  elements?: ElementConfig<State, Actions>[]
}
