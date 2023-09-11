import { Container } from 'hostConfig'
import { unstable_ImmediatePriority, unstable_runWithPriority } from 'scheduler'
import type { ReactElement } from '@jsy-react/shared'
import { FiberNode, FiberRootNode } from './fiber'
import { UpdateQueue, createUpdate, createUpdateQueue, enqueueUpdate } from './updateQueue'
import { HostRoot } from './workTags'
import { scheduleUpdateOnFiber } from './workLoop'
import { requestUpdateLane } from './fiberLanes'

export const createContainer = (container: Container) => {
  const hostRootFiber = new FiberNode(HostRoot, {}, null)
  const root = new FiberRootNode(container, hostRootFiber)

  hostRootFiber.updateQueue = createUpdateQueue()

  return root
}

export const updateContainer = (element: ReactElement | null, root: FiberRootNode) => {
  // 首屏渲染 同步优先级更新
  unstable_runWithPriority(unstable_ImmediatePriority, () => {
    const hostRootFiber = root.current
    const lane = requestUpdateLane()
    const update = createUpdate<ReactElement | null>(element, lane)
    enqueueUpdate(hostRootFiber.updateQueue as UpdateQueue<ReactElement | null>, update)
    scheduleUpdateOnFiber(hostRootFiber, lane)
  })
  return element
}
