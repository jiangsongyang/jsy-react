import type { FiberNode } from './fiber'

export const renderWithHooks = (workInProgress: FiberNode) => {
  const Component = workInProgress.type
  const props = workInProgress.pendingProps
  const childen = Component(props)
  return childen
}
