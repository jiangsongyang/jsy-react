import type { Key, Props, ReactElement } from '@jsy-react/shared'
import type { Container } from 'hostConfig'
import { FunctionComponent, HostComponent, WorkTag } from './workTags'
import { Flags, NoFlags } from './fiberFlags'

export class FiberNode {
  tag: WorkTag
  key: Key
  stateNode: any
  type: any

  return: FiberNode | null
  sibling: FiberNode | null
  child: FiberNode | null
  index: number

  ref: any

  // 开始准备工作的时候 props 的值
  pendingProps: Props | null
  // 工作完成后 props 的值
  memoizedProps: Props | null
  memoizedState: any
  updateQueue: unknown

  alternate: FiberNode | null

  flags: Flags
  subtreeFlags: Flags

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    // 实例相关信息
    this.tag = tag
    this.key = key
    this.stateNode = null
    this.type = null

    // 树结构 节点位置相关信息
    // 父fiber
    this.return = null
    this.sibling = null
    this.child = null
    this.index = 0

    this.ref = null

    // 作为工作单元相关信息
    this.pendingProps = pendingProps
    this.memoizedProps = null
    this.memoizedState = null
    this.updateQueue = null

    // 双缓存
    this.alternate = null

    // 副作用
    this.flags = NoFlags
    this.subtreeFlags = NoFlags
  }
}

export class FiberRootNode {
  container: Container
  current: FiberNode
  finishedWork: FiberNode | null

  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container
    this.current = hostRootFiber
    hostRootFiber.stateNode = this
    this.finishedWork = null
  }
}

export const createWorkInProgress = (current: FiberNode, pendingProps: Props): FiberNode => {
  let workInProgress = current.alternate
  // 首屏渲染
  // mount
  if (workInProgress === null) {
    workInProgress = new FiberNode(current.tag, pendingProps, current.key)
    workInProgress.stateNode = current.stateNode

    // 处理双缓存
    workInProgress.alternate = current
    current.alternate = workInProgress
  }
  // 首屏渲染
  // update
  else {
    workInProgress.pendingProps = pendingProps
    // 清空副作用
    workInProgress.flags = NoFlags
    workInProgress.subtreeFlags = NoFlags
  }

  workInProgress.type = current.type
  workInProgress.updateQueue = current.updateQueue
  workInProgress.child = current.child
  workInProgress.memoizedProps = current.memoizedProps
  workInProgress.memoizedState = current.memoizedState

  return workInProgress
}

export const createFiberFromElement = (element: ReactElement): FiberNode => {
  const { type, key, props } = element

  let fiberTag: WorkTag = FunctionComponent

  if (typeof type === 'string') {
    // <div> => type = 'div'
    fiberTag = HostComponent
  } else if (typeof type === 'function') {
    fiberTag = FunctionComponent
  }

  const fiber = new FiberNode(fiberTag, props, key)
  fiber.type = type
  return fiber
}
