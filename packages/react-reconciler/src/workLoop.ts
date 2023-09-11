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
  commitMutationEffects,
} from './commitWork'
import { completeWork } from './completeWork'
import { FiberNode, FiberRootNode, PendingPassiveEffects, createWorkInProgress } from './fiber'
import { MutationMask, NoFlags, PassiveMask } from './fiberFlags'
import {
  NoLane,
  SyncLane,
  getHighestPriorityLane,
  lanesToSchedulerPriority,
  markRootFinished,
  mergeLanes,
} from './fiberLanes'
import type { Lane } from './fiberLanes'
import { HostRoot } from './workTags'
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue'
import { HookHasEffect, Passive } from './hookEffectTags'

let workInProgress: FiberNode | null = null
// 本次更新的 lane 是什么
let workInProgressRenderLane: Lane = NoLane

let rootDoesHasPassiveEffects: boolean = false

type RootExitStatus = number

const RootInComplete: RootExitStatus = 1
const RootCompleted: RootExitStatus = 2

// 初始化工作
// 找到初始化的节点
const prepareFreshStack = (root: FiberRootNode, lane: Lane) => {
  root.finishedLane = NoLane
  root.finishedWork = null
  workInProgress = createWorkInProgress(root.current, {})
  workInProgressRenderLane = lane
}

export const scheduleUpdateOnFiber = (fiber: FiberNode, lane: Lane) => {
  // 获取 fiberRootNode
  const root = markUpdateFromFiberToRoot(fiber)
  markRootUpdated(root, lane)
  ensureRootIsScheduled(root)
}

function ensureRootIsScheduled(root: FiberRootNode) {
  const updateLane = getHighestPriorityLane(root.pendingLanes)
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

function markRootUpdated(root: FiberRootNode, lane: Lane) {
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
      shouldTimeSlice ? workLoopConcurrent() : workLoopSync()
      break
    } catch (e) {
      if (__DEV__) {
        console.warn(`work loop error :`, e)
      }
      workInProgress = null
    }
  } while (true)

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

  const lane = getHighestPriorityLane(root.pendingLanes)
  const curCallbackNode = root.callbackNode
  if (lane === NoLane) {
    return null
  }
  const needSync = lane === SyncLane || didTimeout
  // render阶段
  const exitStatus = renderRoot(root, lane, !needSync)

  ensureRootIsScheduled(root)

  if (exitStatus === RootInComplete) {
    // 中断
    if (root.callbackNode !== curCallbackNode) {
      return null
    }
    return performConcurrentWorkOnRoot.bind(null, root)
  }
  if (exitStatus === RootCompleted) {
    const finishedWork = root.current.alternate
    root.finishedWork = finishedWork
    root.finishedLane = lane
    workInProgressRenderLane = NoLane
    commitRoot(root)
  } else if (__DEV__) {
    console.error('还未实现的并发更新结束状态')
  }
}

// 渲染阶段的入口方法
export const performSyncWorkOnRoot = (root: FiberRootNode) => {
  const nextLane = getHighestPriorityLane(root.pendingLanes)

  if (nextLane !== SyncLane) {
    // 其他比SyncLane低的优先级
    // NoLane
    ensureRootIsScheduled(root)
    return
  }

  const exitStatus = renderRoot(root, nextLane, false)

  if (exitStatus === RootCompleted) {
    const finishedWork = root.current.alternate
    root.finishedWork = finishedWork
    root.finishedLane = nextLane
    workInProgressRenderLane = NoLane

    // wip fiberNode树 树中的flags
    commitRoot(root)
  } else if (__DEV__) {
    console.error('还未实现的同步更新结束状态')
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
