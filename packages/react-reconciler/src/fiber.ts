import type { Key, Props, ReactElement } from '@jsy-react/shared'
import type { Container } from 'hostConfig'
import { Fragment, FunctionComponent, HostComponent, WorkTag } from './workTags'
import { Flags, NoFlags } from './fiberFlags'
import { NoLanes } from './fiberLanes'
import type { Lane, Lanes } from './fiberLanes'
import { Effect } from './fiberHooks'

export class FiberNode {
  tag: WorkTag
  key: Key
  stateNode: any
  type: any

  // 构成树结构
  return: FiberNode | null
  sibling: FiberNode | null
  child: FiberNode | null
  index: number

  ref: any

  // 开始准备工作的时候 props 的值
  pendingProps: Props | null
  // 工作完成后 props 的值
  memoizedProps: Props | null
  // 指向一个 fc 的 hook 链表的第 0 个
  memoizedState: any

  updateQueue: unknown

  alternate: FiberNode | null

  flags: Flags
  subtreeFlags: Flags
  deletions: FiberNode[] | null

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    // 实例相关信息
    this.tag = tag
    this.key = key || null
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
    this.deletions = null
  }
}

export interface PendingPassiveEffects {
  unmount: Effect[]
  update: Effect[]
}

export class FiberRootNode {
  container: Container
  current: FiberNode
  finishedWork: FiberNode | null
  pendingLanes: Lanes
  finishedLane: Lane
  pendingPassiveEffects: PendingPassiveEffects

  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container
    this.current = hostRootFiber
    hostRootFiber.stateNode = this
    this.finishedWork = null
    this.pendingLanes = NoLanes
    this.finishedLane = NoLanes

    this.pendingPassiveEffects = {
      unmount: [],
      update: [],
    }
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
    workInProgress.deletions = null
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
    // function component
    fiberTag = FunctionComponent
  }

  const fiber = new FiberNode(fiberTag, props, key)
  fiber.type = type
  return fiber
}

export const createFiberFromFragment = (elements: any[], key: Key) => {
  const fiber = new FiberNode(Fragment, elements, key)
  return fiber
}
