import currentDispatcher, { resolveDispatcher } from './src/currentDispatcher'
import type { Dispatcher } from './src/currentDispatcher'
import currentBatchConfig from './src/currentBatchConfig'
import { isValidElementFn, jsx, jsxDEV } from './src/jsx'

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
}
