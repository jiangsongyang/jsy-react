import currentDispatcher, { resolveDispatcher } from './src/currentDispatcher'
import type { Dispatcher } from './src/currentDispatcher'
import currentBatchConfig from './src/currentBatchConfig'
import { isValidElementFn, jsx, jsxDEV } from './src/jsx'
export {
  REACT_FRAGMENT_TYPE as Fragment,
  REACT_SUSPENSE_TYPE as Suspense,
} from 'shared/constants/react-symbols'
export { createContext } from './context'

export const useState: Dispatcher['useState'] = initialState => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useState(initialState)
}

export const useEffect: Dispatcher['useEffect'] = (create, deps) => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useEffect(create, deps)
}

export const useTransition: Dispatcher['useTransition'] = () => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useTransition()
}

export const useRef: Dispatcher['useRef'] = initialValue => {
  const dispatcher = resolveDispatcher() as Dispatcher
  return dispatcher.useRef(initialValue)
}

export const useContext: Dispatcher['useContext'] = context => {
  const dispatcher = resolveDispatcher() as Dispatcher
  return dispatcher.useContext(context)
}

export const use: Dispatcher['use'] = usable => {
  const dispatcher = resolveDispatcher() as Dispatcher
  return dispatcher.use(usable)
}

// 内部数据共享层
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
  currentDispatcher,
  currentBatchConfig,
}

export const version = '0.0.1'
export const createElement = jsx
export const isValidElement = isValidElementFn

export default {
  version: '0.0.1',
  createElement: jsxDEV,
  isValidElement,
  // hooks
  useState,
  useEffect,
  useRef,
  useTransition,
  useContext,
}
