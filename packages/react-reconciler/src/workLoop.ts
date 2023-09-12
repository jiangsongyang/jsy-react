import { scheduleMicroTask } from 'hostConfig'
import {
  unstable_NormalPriority as NormalPriority,
  unstable_scheduleCallback as scheduleCallback,
  unstable_cancelCallback,
  unstable_shouldYield,
} from 'scheduler'
import { beginWork } from './beginWork'
import {
  commitHookEffectListCreate,
  commitHookEffectListDestory,
  commitHookEffectListUnmount,
  commitLayoutEffects,
  commitMutationEffects,
} from './commitWork'
import { completeWork } from './completeWork'
import { FiberNode, FiberRootNode, PendingPassiveEffects, createWorkInProgress } from './fiber'
import { HostEffectMask, MutationMask, NoFlags, PassiveMask } from './fiberFlags'
import {
  NoLane,
  SyncLane,
  getNextLane,
  lanesToSchedulerPriority,
  markRootFinished,
  markRootSuspended,
  mergeLanes,
} from './fiberLanes'
import type { Lane } from './fiberLanes'
import { HostRoot } from './workTags'
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue'
import { HookHasEffect, Passive } from './hookEffectTags'
import { unwindWork } from './fiberUnwindWork'
import { SuspenseException, getSuspenseThenable } from './thenable'
import { resetHooksOnUnwind } from './fiberHooks'
import { throwException } from './fiberThrow'

let workInProgress: FiberNode | null = null
// 本次更新的 lane 是什么
let workInProgressRenderLane: Lane = NoLane

let rootDoesHasPassiveEffects: boolean = false

type RootExitStatus = number

// 工作中的状态
const RootInProgress = 0
// 并发中间状态
const RootInComplete: RootExitStatus = 1
// 完成状态
const RootCompleted: RootExitStatus = 2
// 未完成状态，不用进入commit阶段
const RootDidNotComplete = 3
let workInProgressRootExitStatus: number = RootInProgress

type SuspendedReason = typeof NotSuspended | typeof SuspendedOnData
const NotSuspended = 0
const SuspendedOnData = 6
let workInProgressSuspendedReason: SuspendedReason = NotSuspended
let workInProgressThrownValue: any = null

// 初始化工作
// 找到初始化的节点
const prepareFreshStack = (root: FiberRootNode, lane: Lane) => {
  root.finishedLane = NoLane
  root.finishedWork = null
  workInProgress = createWorkInProgress(root.current, {})
  workInProgressRenderLane = lane

  workInProgressRootExitStatus = RootInProgress
  workInProgressSuspendedReason = NotSuspended
  workInProgressThrownValue = null
}

export const scheduleUpdateOnFiber = (fiber: FiberNode, lane: Lane) => {
  // 获取 fiberRootNode
  const root = markUpdateFromFiberToRoot(fiber)
  markRootUpdated(root, lane)
  ensureRootIsScheduled(root)
}

export function ensureRootIsScheduled(root: FiberRootNode) {
  const updateLane = getNextLane(root)
  const existingCallback = root.callbackNode

  if (updateLane === NoLane) {
    if (existingCallback !== null) {
      unstable_cancelCallback(existingCallback)
    }
    root.callbackNode = null
    root.callbackPriority = NoLane
    return
  }

  const curPriority = updateLane
  const prevPriority = root.callbackPriority

  if (curPriority === prevPriority) {
    return
  }

  if (existingCallback !== null) {
    unstable_cancelCallback(existingCallback)
  }
  let newCallbackNode = null

  if (__DEV__) {
    console.log(`在${updateLane === SyncLane ? '微' : '宏'}任务中调度，优先级：`, updateLane)
  }

  if (updateLane === SyncLane) {
    // 同步优先级 用微任务调度
    // [performSyncWorkOnRoot, performSyncWorkOnRoot, performSyncWorkOnRoot]
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane))
    scheduleMicroTask(flushSyncCallbacks)
  } else {
    // 其他优先级 用宏任务调度
    const schedulerPriority = lanesToSchedulerPriority(updateLane)

    newCallbackNode = scheduleCallback(
      schedulerPriority,
      // @ts-ignore
      performConcurrentWorkOnRoot.bind(null, root)
    )
  }
  root.callbackNode = newCallbackNode
  root.callbackPriority = curPriority
}

export function markRootUpdated(root: FiberRootNode, lane: Lane) {
  root.pendingLanes = mergeLanes(root.pendingLanes, lane)
}

const markUpdateFromFiberToRoot = (fiber: FiberNode) => {
  let node = fiber
  let parent = node.return

  while (parent !== null) {
    node = parent
    parent = node.return
  }

  if (node.tag === HostRoot) {
    return node.stateNode
  }

  return null
}

const renderRoot = (root: FiberRootNode, lane: Lane, shouldTimeSlice: boolean) => {
  if (__DEV__) {
    console.log(`开始${shouldTimeSlice ? '并发' : '同步'}更新`, root)
  }
  if (workInProgressRenderLane !== lane) {
    // 初始化
    prepareFreshStack(root, lane)
  }

  do {
    try {
      if (workInProgressSuspendedReason !== NotSuspended && workInProgress !== null) {
        // unwind 流程
        const thrownValue = workInProgressThrownValue
        workInProgressSuspendedReason = NotSuspended
        workInProgressThrownValue = null
        // unwind 操作
        throwAndUnwindWorkLoop(root, workInProgress, thrownValue, lane)
      }

      shouldTimeSlice ? workLoopConcurrent() : workLoopSync()
      break
    } catch (e) {
      if (__DEV__) {
        console.warn(`work loop error :`, e)
      }
      // 捕获错误
      handleThrow(root, e)
    }
  } while (true)

  if (workInProgressRootExitStatus !== RootInProgress) {
    return workInProgressRootExitStatus
  }

  // 中断执行 || 执行完成
  if (shouldTimeSlice && workInProgress !== null) {
    return RootInComplete
  }
  if (!shouldTimeSlice && workInProgress !== null && __DEV__) {
    console.error(`render阶段结束时 , wip不应该是null`)
  }
  return RootCompleted
}

// 并发渲染入口
export const performConcurrentWorkOnRoot: (root: FiberRootNode, didTimeout: boolean) => any = (
  root,
  didTimeout
) => {
  const curCallback = root.callbackNode
  const didFlushPassiveEffect = flushPassiveEffects(root.pendingPassiveEffects)
  if (didFlushPassiveEffect) {
    if (root.callbackNode !== curCallback) {
      return null
    }
  }

  const lane = getNextLane(root)
  const curCallbackNode = root.callbackNode
  if (lane === NoLane) {
    return null
  }
  const needSync = lane === SyncLane || didTimeout
  // render阶段
  const exitStatus = renderRoot(root, lane, !needSync)

  ensureRootIsScheduled(root)

  switch (exitStatus) {
    // 中断
    case RootInComplete:
      if (root.callbackNode !== curCallbackNode) {
        return null
      }
      return performConcurrentWorkOnRoot.bind(null, root)
    case RootCompleted:
      const finishedWork = root.current.alternate
      root.finishedWork = finishedWork
      root.finishedLane = lane
      workInProgressRenderLane = NoLane
      commitRoot(root)
      break
    case RootDidNotComplete:
      markRootSuspended(root, lane)
      workInProgressRenderLane = NoLane
      ensureRootIsScheduled(root)
      break
    default:
      if (__DEV__) {
        console.error('还未实现的并发更新结束状态')
      }
  }
}

// 渲染阶段的入口方法
export const performSyncWorkOnRoot = (root: FiberRootNode) => {
  const nextLane = getNextLane(root)

  if (nextLane !== SyncLane) {
    // 其他比SyncLane低的优先级
    // NoLane
    ensureRootIsScheduled(root)
    return
  }

  const exitStatus = renderRoot(root, nextLane, false)

  switch (exitStatus) {
    case RootCompleted:
      const finishedWork = root.current.alternate
      root.finishedWork = finishedWork
      root.finishedLane = nextLane
      workInProgressRenderLane = NoLane
      commitRoot(root)
      break
    case RootDidNotComplete:
      workInProgressRenderLane = NoLane
      markRootSuspended(root, nextLane)
      ensureRootIsScheduled(root)
      break
    default:
      if (__DEV__) {
        console.error('还未实现的同步更新结束状态')
      }
      break
  }
}
/**
 * commit 阶段的3个子阶段
 * 1. beforeMutation
 * 2. mutation
 * 3. layout
 */
const commitRoot = (root: FiberRootNode) => {
  const finishedWork = root.finishedWork

  if (finishedWork === null) {
    return
  }

  if (__DEV__) {
    console.warn(`commit阶段开始 : `, finishedWork)
  }

  const lane = root.finishedLane

  if (lane === NoLane) {
    console.error(`finished lane 不应该是 NoLane`)
  }

  // 重置
  root.finishedWork = null
  root.finishedLane = NoLane

  markRootFinished(root, lane)

  if (
    (finishedWork.flags & PassiveMask) !== NoFlags ||
    (finishedWork.subtreeFlags & PassiveMask) !== NoFlags
  ) {
    // 函数组件有副作用
    if (!rootDoesHasPassiveEffects) {
      rootDoesHasPassiveEffects = true
      // 调度副作用
      scheduleCallback(NormalPriority, () => {
        // 执行副作用
        flushPassiveEffects(root.pendingPassiveEffects)
        // eslint-disable-next-line
        return
      })
    }
  }

  // 判断是否存在3个子阶段需要执行的操作
  // root flags , root subtreeFlags
  const subtreeFlasg = (finishedWork.subtreeFlags & MutationMask) !== NoFlags

  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags

  if (subtreeFlasg || rootHasEffect) {
    // 执行3个子阶段
    // 1. beforeMutation
    // 2. mutation
    commitMutationEffects(finishedWork, root)
    // 更换双缓存
    root.current = finishedWork
    // 3. layout
    commitLayoutEffects(finishedWork, root)
  } else {
    // 更换双缓存
    root.current = finishedWork
  }

  // 重置
  rootDoesHasPassiveEffects = false
  ensureRootIsScheduled(root)
}

const flushPassiveEffects = (pendingPassiveEffects: PendingPassiveEffects) => {
  let didFulshPassiveEffect = false
  // 执行副作用
  // 先执行 destory
  pendingPassiveEffects.unmount.forEach(effect => {
    didFulshPassiveEffect = true
    commitHookEffectListUnmount(Passive, effect)
  })

  pendingPassiveEffects.unmount = []

  pendingPassiveEffects.update.forEach(effect => {
    didFulshPassiveEffect = true
    commitHookEffectListDestory(Passive | HookHasEffect, effect)
  })

  pendingPassiveEffects.update.forEach(effect => {
    didFulshPassiveEffect = true
    commitHookEffectListCreate(Passive | HookHasEffect, effect)
  })

  pendingPassiveEffects.update = []
  flushSyncCallbacks()
  return didFulshPassiveEffect
}

const workLoopSync = () => {
  // eslint-disable-next-line no-unmodified-loop-condition
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

const workLoopConcurrent = () => {
  // eslint-disable-next-line no-unmodified-loop-condition
  while (workInProgress !== null && !unstable_shouldYield()) {
    performUnitOfWork(workInProgress)
  }
}

const performUnitOfWork = (fiber: FiberNode) => {
  const next = beginWork(fiber, workInProgressRenderLane)
  fiber.memoizedProps = fiber.pendingProps
  // 递归到最深层
  // 开始归
  if (next === null) {
    completeUnitOfWork(fiber)
  } else {
    workInProgress = next
  }
}

const completeUnitOfWork = (fiber: FiberNode) => {
  let node: FiberNode | null = fiber
  do {
    completeWork(node)
    // 处理兄弟节点
    const sibling = node.sibling
    if (sibling !== null) {
      workInProgress = sibling
      return
    }
    node = node.return
    workInProgress = node
  } while (node !== null)
}

function handleThrow(root: FiberRootNode, thrownValue: any): void {
  /*
		throw可能的情况
			1. use thenable
			2. error (Error Boundary处理)
	*/
  if (thrownValue === SuspenseException) {
    workInProgressSuspendedReason = SuspendedOnData
    thrownValue = getSuspenseThenable()
  } else {
    // TODO Error Boundary
  }
  workInProgressThrownValue = thrownValue
}

function throwAndUnwindWorkLoop(
  root: FiberRootNode,
  unitOfWork: FiberNode,
  thrownValue: any,
  lane: Lane
) {
  // unwind前的重置hook，避免 hook0 use hook1 时 use造成中断，再恢复时前后hook对应不上
  resetHooksOnUnwind()
  // 请求后返回重新触发更新
  throwException(root, thrownValue, lane)
  // unwind 流程
  unwindUnitOfWork(unitOfWork)
}

function unwindUnitOfWork(unitOfWork: FiberNode) {
  let incompleteWork: FiberNode | null = unitOfWork
  do {
    const next = unwindWork(incompleteWork)

    if (next !== null) {
      next.flags &= HostEffectMask
      workInProgress = next
      return
    }

    const returnFiber = incompleteWork.return as FiberNode
    if (returnFiber !== null) {
      returnFiber.deletions = null
    }
    incompleteWork = returnFiber
    // workInProgress = incompleteWork;
  } while (incompleteWork !== null)

  // 没有 边界 中止unwind流程，一直到root
  workInProgress = null
  workInProgressRootExitStatus = RootDidNotComplete
}
