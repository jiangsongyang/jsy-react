import type { Action, ReactContext } from '@jsy-react/shared'

export type Dispatch<State> = (action: Action<State>) => void

export interface Dispatcher {
  useState: <T>(initialState: () => T | T) => [T, Dispatch<T>]
  useEffect: (create: () => void | void, deps?: any[]) => void
  useTransition: () => [boolean, (callback: () => void) => void]
  useRef: <T>(initialValue: T) => { current: T }
  useContext: <T>(context: ReactContext<T>) => T
}

export const currentDispatcher: { current: Dispatcher | null } = {
  current: null,
}

export const resolveDispatcher = () => {
  const dispatcher = currentDispatcher.current
  if (dispatcher === null) {
    throw new Error('Hooks can only be called inside the body of a function component. ')
  }

  return dispatcher
}

export default currentDispatcher
