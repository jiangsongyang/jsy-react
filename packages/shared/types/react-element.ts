export type Type = any
export type Key = any
export type Ref = { current: any } | ((instance: any) => void)
export type Props = any

export type ReactElement = {
  $$typeof: symbol | number
  type: Type
  key: Key
  ref: Ref
  props: Props
  __logo: string
}
