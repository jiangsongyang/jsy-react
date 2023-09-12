// 递归中的递

import { ReactElement } from '@jsy-react/shared'
import { mountChildFibers, reconcileChildFibers } from './childFibers'
import { FiberNode } from './fiber'
import { pushProvider } from './fiberContext'
import { Ref } from './fiberFlags'
import { renderWithHooks } from './fiberHooks'
import type { Lane } from './fiberLanes'
import { UpdateQueue, processUpdateQueue } from './updateQueue'
import {
  ContextProvider,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from './workTags'

export const beginWork = (workInProgress: FiberNode, renderLean: Lane) => {
  // 返回比较完成的 子 fiberNode
  switch (workInProgress.tag) {
    case HostRoot:
      return updateHostRoot(workInProgress, renderLean)
    case HostComponent:
      return updateHostComponent(workInProgress)
    case HostText:
      return null
    case FunctionComponent:
      return updateFunctionComponent(workInProgress, renderLean)
    case Fragment:
      return updateFragment(workInProgress)
    case ContextProvider:
      return updateContextProvider(workInProgress)
    default:
      if (__DEV__) {
        console.warn(`beginWork 未实现的类型 : `, workInProgress.tag)
      }
      break
  }
  return null
}

function updateContextProvider(wip: FiberNode) {
  const providerType = wip.type
  const context = providerType._context
  const newProps = wip.pendingProps

  pushProvider(context, newProps.value)

  const nextChildren = newProps.children
  reconcileChildren(wip, nextChildren)
  return wip.child
}

const updateFragment = (workInProgress: FiberNode) => {
  console.log(`updateFragment`, workInProgress)

  const nextChildren = workInProgress.pendingProps
  reconcileChildren(workInProgress, nextChildren)
  return workInProgress.child
}

const updateFunctionComponent = (workInProgress: FiberNode, renderLean: Lane) => {
  const nextChildren = renderWithHooks(workInProgress, renderLean)
  reconcileChildren(workInProgress, nextChildren)
  return workInProgress.child
}

// 计算状态的最新值

const updateHostRoot = (workInProgress: FiberNode, renderLean: Lane) => {
  console.log(`updateHostRoot`, workInProgress)

  const baseState = workInProgress.memoizedState
  const updateQueue = workInProgress.updateQueue as UpdateQueue<Element>
  const pending = updateQueue.shared.pending!

  updateQueue.shared.pending = null

  const { memoizedState } = processUpdateQueue(baseState, pending, renderLean)
  workInProgress.memoizedState = memoizedState

  const nextChildren = workInProgress.memoizedState
  reconcileChildren(workInProgress, nextChildren)
  return workInProgress.child
}

const updateHostComponent = (workInProgress: FiberNode) => {
  const nextProps = workInProgress.pendingProps
  const nextChildren = nextProps.children
  markRef(workInProgress.alternate, workInProgress)
  reconcileChildren(workInProgress, nextChildren)
  return workInProgress.child
}

const reconcileChildren = (workInProgress: FiberNode, children?: ReactElement) => {
  const current = workInProgress.alternate
  if (current !== null) {
    // update about
    workInProgress.child = reconcileChildFibers(workInProgress, current.child, children)
  }
  // mount about
  else {
    workInProgress.child = mountChildFibers(workInProgress, null, children)
  }
}

function markRef(current: FiberNode | null, workInProgress: FiberNode) {
  const ref = workInProgress.ref

  // mount 时存在 ref 或者 update 时 ref引用变化
  if ((current === null && ref !== null) || (current !== null && current.ref !== ref)) {
    workInProgress.flags |= Ref
  }
}
