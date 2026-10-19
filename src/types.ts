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
  subscribe(callback: (state: State) => void): () => void
}

export type Attributes = Record<string, unknown>

export type StringKey<State> = {
  [Key in keyof State]-?: State[Key] extends string ? Key : never
}[keyof State] & string

export type EventBindings<State extends object, Actions> = {
  [Name in keyof HTMLElementEventMap]?:
    | (keyof Actions & string)
    | ((
        event: HTMLElementEventMap[Name],
        store: Controller<State, Actions>,
        index: number,
      ) => void | Promise<void>)
}

type Selector =
  | { select: string; selectAll?: never }
  | { selectAll: string; select?: never }

export type ElementConfig<State extends object, Actions = {}> = Selector & {
  attribute?: (state: State, index: number) => Attributes | null | undefined
  on?: EventBindings<State, Actions>
  sync?: StringKey<State>
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
