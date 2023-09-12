import type { Key, Props, ReactElement } from '@jsy-react/shared'
import type { Container } from 'hostConfig'
import { CallbackNode } from 'scheduler'
import { REACT_PROVIDER_TYPE, REACT_SUSPENSE_TYPE } from '@jsy-react/shared/constants/react-symbols'
import { Wakeable } from '@jsy-react/shared/types'
import {
  ContextProvider,
  Fragment,
  FunctionComponent,
  HostComponent,
  OffscreenComponent,
  SuspenseComponent,
  WorkTag,
} from './workTags'
import { Flags, NoFlags } from './fiberFlags'
import { NoLane, NoLanes } from './fiberLanes'
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
  suspendedLanes: Lanes
  finishedLane: Lane
  pendingPassiveEffects: PendingPassiveEffects

  callbackNode: CallbackNode | null
  callbackPriority: Lane

  pingCache: WeakMap<Wakeable<any>, Set<Lane>> | null

  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container
    this.current = hostRootFiber
    hostRootFiber.stateNode = this
    this.finishedWork = null
    this.pendingLanes = NoLanes
    this.suspendedLanes = NoLanes
    this.finishedLane = NoLanes

    this.callbackNode = null
    this.callbackPriority = NoLane

    this.pendingPassiveEffects = {
      unmount: [],
      update: [],
    }

    this.pingCache = null
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

  workInProgress.ref = current.ref

  return workInProgress
}

export const createFiberFromElement = (element: ReactElement): FiberNode => {
  const { type, key, props, ref } = element
  let fiberTag: WorkTag = FunctionComponent

  if (typeof type === 'string') {
    // <div/> type: 'div'
    fiberTag = HostComponent
  } else if (typeof type === 'object' && type.$$typeof === REACT_PROVIDER_TYPE) {
    fiberTag = ContextProvider
  } else if (type === REACT_SUSPENSE_TYPE) {
    fiberTag = SuspenseComponent
  } else if (typeof type !== 'function' && __DEV__) {
    console.warn('为定义的type类型', element)
  }
  const fiber = new FiberNode(fiberTag, props, key)
  fiber.type = type
  fiber.ref = ref
  return fiber
}

export const createFiberFromFragment = (elements: any[], key: Key) => {
  const fiber = new FiberNode(Fragment, elements, key)
  return fiber
}

export interface OffscreenProps {
  mode: 'visible' | 'hidden'
  children: any
}

export function createFiberFromOffscreen(pendingProps: OffscreenProps) {
  const fiber = new FiberNode(OffscreenComponent, pendingProps, null)
  // TODO stateNode
  return fiber
}
