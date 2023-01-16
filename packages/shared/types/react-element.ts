export type Type = any
export type Key = any
export type Ref = any
export type Props = any

export type ReactElement = {
  $$typeof: symbol | number
  type: Type
  key: Key
  ref: Ref
  props: Props
  __logo: string
}
