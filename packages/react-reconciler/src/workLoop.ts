import { scheduleMicroTask } from 'hostConfig'
import {
  unstable_NormalPriority as NormalPriority,
  unstable_scheduleCallback as scheduleCallback,
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
  getHeightestPriorityLane,
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

// 找到初始化的节点
const prepareFreshStack = (root: FiberRootNode, lane: Lane) => {
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
  const updateLane = getHeightestPriorityLane(root.pendingLanes)
  if (updateLane === NoLane) {
    return
  }
  if (updateLane === SyncLane) {
    // 同步优先级 用微任务调度
    if (__DEV__) {
      console.log('在微任务中调度，优先级：', updateLane)
    }
    // [performSyncWorkOnRoot, performSyncWorkOnRoot, performSyncWorkOnRoot]
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane))
    scheduleMicroTask(flushSyncCallbacks)
  } else {
    // 其他优先级 用宏任务调度
  }
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

// 渲染阶段的入口方法
export const performSyncWorkOnRoot = (root: FiberRootNode, lane: Lane) => {
  const nextLane = getHeightestPriorityLane(root.pendingLanes)

  if (nextLane !== SyncLane) {
    // 其他比SyncLane低的优先级
    // NoLane
    ensureRootIsScheduled(root)
    return
  }

  if (__DEV__) {
    console.warn('render阶段开始')
  }
  // 初始化
  prepareFreshStack(root, lane)

  do {
    try {
      workLoop()
      break
    } catch (e) {
      if (__DEV__) {
        console.warn(`work loop error :`, e)
      }
      workInProgress = null
    }
  } while (true)
  const finishedWork = root.current.alternate
  root.finishedWork = finishedWork
  root.finishedLane = lane
  workInProgressRenderLane = NoLane

  // 本次更新的 lane
  root.finishedLane = lane

  // workinprogress fiberNode树 树中的 flags

  commitRoot(root)
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
  // 执行副作用
  // 先执行 destory
  pendingPassiveEffects.unmount.forEach(effect => {
    commitHookEffectListUnmount(Passive, effect)
  })

  pendingPassiveEffects.unmount = []

  pendingPassiveEffects.update.forEach(effect => {
    commitHookEffectListDestory(Passive | HookHasEffect, effect)
  })

  pendingPassiveEffects.update.forEach(effect => {
    commitHookEffectListCreate(Passive | HookHasEffect, effect)
  })

  pendingPassiveEffects.update = []
  flushSyncCallbacks()
}

const workLoop = () => {
  // eslint-disable-next-line no-unmodified-loop-condition
  while (workInProgress !== null) {
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
