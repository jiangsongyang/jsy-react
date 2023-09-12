export type WorkTag =
  | typeof FunctionComponent
  | typeof HostRoot
  | typeof HostComponent
  | typeof HostText
  | typeof Fragment
  | typeof ContextProvider
  | typeof SuspenseComponent
  | typeof OffscreenComponent

export const FunctionComponent = 0
// reactDom.createRoot 对应的 fiber
export const HostRoot = 3
// <div> <span>
export const HostComponent = 5
// 宿主文本节点
export const HostText = 6
// <></>
export const Fragment = 7
// context provider
export const ContextProvider = 8
// suspense
export const SuspenseComponent = 13
// suspense 子组件
export const OffscreenComponent = 14
