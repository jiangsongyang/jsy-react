import { Container } from 'hostConfig'
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
  const hostRootFiber = root.current
  const lane = requestUpdateLane()
  // 创建一个更新任务 拿到需要更新的 jsx
  const update = createUpdate<ReactElement | null>(element, lane)

  enqueueUpdate(hostRootFiber.updateQueue as UpdateQueue<ReactElement | null>, update)

  // 开始给 fiber 节点调度更新任务
  scheduleUpdateOnFiber(hostRootFiber)

  return element
}
