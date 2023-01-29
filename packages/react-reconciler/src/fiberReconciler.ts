import { Container } from 'hostConfig'
import type { ReactElement } from '@jsy-react/shared'
import { FiberNode, FiberRootNode } from './fiber'
import { UpdateQueue, createUpdate, createUpdateQueue, enqueueUpdate } from './updateQueue'
import { HostRoot } from './workTags'
import { scheduleUpdateOnFiber } from './workLoop'

export const createContainer = (container: Container) => {
  const hostRootFiber = new FiberNode(HostRoot, {}, null)
  const root = new FiberRootNode(container, hostRootFiber)

  hostRootFiber.updateQueue = createUpdateQueue()

  return root
}

export const updateContainer = (element: ReactElement | null, root: FiberRootNode) => {
  const hostRootFiber = root.current
  const update = createUpdate<ReactElement | null>(element)

  enqueueUpdate(hostRootFiber.updateQueue as UpdateQueue<ReactElement | null>, update)

  scheduleUpdateOnFiber(hostRootFiber)

  return element
}
