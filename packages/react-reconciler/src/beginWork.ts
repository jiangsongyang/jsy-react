// 递归中的递

import { ReactElement } from 'packages/shared'
import { mountChildFibers, reconcileChildFibers } from './childFibers'
import { FiberNode } from './fiber'
import { renderWithHooks } from './fiberHooks'
import { UpdateQueue, processUpdateQueue } from './updateQueue'
import { FunctionComponent, HostComponent, HostRoot, HostText } from './workTags'

export const beginWork = (workInProgress: FiberNode) => {
  // 返回比较完成的 子 fiberNode
  switch (workInProgress.tag) {
    case HostRoot:
      return updateHostRoot(workInProgress)
    case HostComponent:
      return updateHostComponent(workInProgress)
    case HostText:
      return null
    case FunctionComponent:
      return updateFunctionComponent(workInProgress)
    default:
      if (__DEV__) {
        console.warn(`beginWork 未实现的类型 : `, workInProgress.tag)
      }
      break
  }
  return null
}

const updateFunctionComponent = (workInProgress: FiberNode) => {
  console.log(`updateFunctionComponent`, workInProgress)

  const nextChildren = renderWithHooks(workInProgress)
  reconcileChildren(workInProgress, nextChildren)
  return workInProgress.child
}

// 计算状态的最新值
const updateHostRoot = (workInProgress: FiberNode) => {
  console.log(`updateHostRoot`, workInProgress)

  const baseState = workInProgress.memoizedState
  const updateQueue = workInProgress.updateQueue as UpdateQueue<Element>
  const pending = updateQueue.shared.pending!

  updateQueue.shared.pending = null

  const { memoizedState } = processUpdateQueue(baseState, pending)
  workInProgress.memoizedState = memoizedState

  const nextChildren = workInProgress.memoizedState
  reconcileChildren(workInProgress, nextChildren)
  return workInProgress.child
}

const updateHostComponent = (workInProgress: FiberNode) => {
  console.log(`updateHostComponent`, workInProgress)

  const nextProps = workInProgress.pendingProps
  const nextChildren = nextProps.children
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
