export type ReactContext<T> = {
  $$typeof: symbol | number
  Provider: ReactProviderType<T> | null
  _currentValue: T
}

export type ReactProviderType<T> = {
  $$typeof: symbol | number
  _context: ReactContext<T> | null
}
