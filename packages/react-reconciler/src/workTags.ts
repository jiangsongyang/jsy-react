export type WorkTag =
  | typeof FunctionComponent
  | typeof HostRoot
  | typeof HostComponent
  | typeof HostText

export const FunctionComponent = 0
// 应用要挂载到的根节点
export const HostRoot = 3
export const HostComponent = 5
export const HostText = 6
