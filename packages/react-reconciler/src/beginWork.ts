// 递归中的递

import { ReactElement } from '@jsy-react/shared'
import { mountChildFibers, reconcileChildFibers } from './childFibers'
import {
  FiberNode,
  OffscreenProps,
  createFiberFromFragment,
  createFiberFromOffscreen,
  createWorkInProgress,
} from './fiber'
import { pushProvider } from './fiberContext'
import { ChildDeletion, DidCapture, NoFlags, Placement, Ref } from './fiberFlags'
import { renderWithHooks } from './fiberHooks'
import type { Lane } from './fiberLanes'
import { pushSuspenseHandler } from './suspenseContext'
import { UpdateQueue, processUpdateQueue } from './updateQueue'
import {
  ContextProvider,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
  OffscreenComponent,
  SuspenseComponent,
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
    case SuspenseComponent:
      return updateSuspenseComponent(workInProgress)
    case OffscreenComponent:
      return updateOffscreenComponent(workInProgress)
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

function updateOffscreenComponent(workInProgress: FiberNode) {
  const nextProps = workInProgress.pendingProps
  const nextChildren = nextProps.children
  reconcileChildren(workInProgress, nextChildren)
  return workInProgress.child
}

function updateSuspenseComponent(workInProgress: FiberNode) {
  const current = workInProgress.alternate
  const nextProps = workInProgress.pendingProps

  let showFallback = false
  const didSuspend = (workInProgress.flags & DidCapture) !== NoFlags

  if (didSuspend) {
    showFallback = true
    workInProgress.flags &= ~DidCapture
  }
  const nextPrimaryChildren = nextProps.children
  const nextFallbackChildren = nextProps.fallback
  pushSuspenseHandler(workInProgress)

  if (current === null) {
    if (showFallback) {
      return mountSuspenseFallbackChildren(
        workInProgress,
        nextPrimaryChildren,
        nextFallbackChildren
      )
    } else {
      return mountSuspensePrimaryChildren(workInProgress, nextPrimaryChildren)
    }
  } else {
    if (showFallback) {
      return updateSuspenseFallbackChildren(
        workInProgress,
        nextPrimaryChildren,
        nextFallbackChildren
      )
    } else {
      return updateSuspensePrimaryChildren(workInProgress, nextPrimaryChildren)
    }
  }
}

function mountSuspensePrimaryChildren(workInProgress: FiberNode, primaryChildren: any) {
  const primaryChildProps: OffscreenProps = {
    mode: 'visible',
    children: primaryChildren,
  }
  const primaryChildFragment = createFiberFromOffscreen(primaryChildProps)
  workInProgress.child = primaryChildFragment
  primaryChildFragment.return = workInProgress
  return primaryChildFragment
}

function mountSuspenseFallbackChildren(
  workInProgress: FiberNode,
  primaryChildren: any,
  fallbackChildren: any
) {
  const primaryChildProps: OffscreenProps = {
    mode: 'hidden',
    children: primaryChildren,
  }
  const primaryChildFragment = createFiberFromOffscreen(primaryChildProps)
  const fallbackChildFragment = createFiberFromFragment(fallbackChildren, null)
  // 父组件Suspense已经mount，所以需要fallback标记Placement
  fallbackChildFragment.flags |= Placement

  primaryChildFragment.return = workInProgress
  fallbackChildFragment.return = workInProgress
  primaryChildFragment.sibling = fallbackChildFragment
  workInProgress.child = primaryChildFragment

  return fallbackChildFragment
}

function updateSuspensePrimaryChildren(workInProgress: FiberNode, primaryChildren: any) {
  const current = workInProgress.alternate as FiberNode
  const currentPrimaryChildFragment = current.child as FiberNode
  const currentFallbackChildFragment: FiberNode | null = currentPrimaryChildFragment.sibling

  const primaryChildProps: OffscreenProps = {
    mode: 'visible',
    children: primaryChildren,
  }

  const primaryChildFragment = createWorkInProgress(currentPrimaryChildFragment, primaryChildProps)
  primaryChildFragment.return = workInProgress
  primaryChildFragment.sibling = null
  workInProgress.child = primaryChildFragment

  if (currentFallbackChildFragment !== null) {
    const deletions = workInProgress.deletions
    if (deletions === null) {
      workInProgress.deletions = [currentFallbackChildFragment]
      workInProgress.flags |= ChildDeletion
    } else {
      deletions.push(currentFallbackChildFragment)
    }
  }

  return primaryChildFragment
}

function updateSuspenseFallbackChildren(
  workInProgress: FiberNode,
  primaryChildren: any,
  fallbackChildren: any
) {
  const current = workInProgress.alternate as FiberNode
  const currentPrimaryChildFragment = current.child as FiberNode
  const currentFallbackChildFragment: FiberNode | null = currentPrimaryChildFragment.sibling

  const primaryChildProps: OffscreenProps = {
    mode: 'hidden',
    children: primaryChildren,
  }
  const primaryChildFragment = createWorkInProgress(currentPrimaryChildFragment, primaryChildProps)
  let fallbackChildFragment

  if (currentFallbackChildFragment !== null) {
    // 可以复用
    fallbackChildFragment = createWorkInProgress(currentFallbackChildFragment, fallbackChildren)
  } else {
    fallbackChildFragment = createFiberFromFragment(fallbackChildren, null)
    fallbackChildFragment.flags |= Placement
  }
  fallbackChildFragment.return = workInProgress
  primaryChildFragment.return = workInProgress
  primaryChildFragment.sibling = fallbackChildFragment
  workInProgress.child = primaryChildFragment

  return fallbackChildFragment
}
