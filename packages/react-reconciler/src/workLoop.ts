import { scheduleMicroTask } from 'hostConfig'
import { beginWork } from './beginWork'
import { commitMutationEffects } from './commitWork'
import { completeWork } from './completeWork'
import { FiberNode, FiberRootNode, createWorkInProgress } from './fiber'
import { MutationMask, NoFlags } from './fiberFlags'
import {
  NoLane,
  SyncLane,
  getHeightestPriorityLane,
  mergeLane,
  requestUpdateLane,
} from './fiberLanes'
import type { Lane } from './fiberLanes'
import { HostRoot } from './workTags'
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue'

let workInProgress: FiberNode | null = null

// 找到初始化的节点
const prepareFreshStack = (root: FiberRootNode) => {
  workInProgress = createWorkInProgress(root.current, {})
}

export const scheduleUpdateOnFiber = (fiber: FiberNode, lane: Lane) => {
  // 获取 fiberRootNode
  const root = markUpdateFromFiberToRoot(fiber)
  markRootUpdated(root, lane)
  ensureRootIsScheduled(root)
}

// 调度阶段的入口
const ensureRootIsScheduled = (root: FiberRootNode) => {
  // 获取最高优先级的 lane
  const updateLane = getHeightestPriorityLane(root.pendingLanes)
  if (updateLane === NoLane) {
    return
  }
  if (updateLane === SyncLane) {
    // 同步优先级
    // 微任务调度
    if (__DEV__) {
      console.log(`在微任务中调度 , 优先级是 : ${updateLane}`)
    }
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane))
    scheduleMicroTask(flushSyncCallbacks)
  } else {
    // 其他优先级
    // 宏任务调度
  }
}

const markRootUpdated = (root: FiberRootNode, lane: Lane) => {
  root.pendingLanes = mergeLane(root.pendingLanes, lane)
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
export const performSyncWorkOnRoot = (
  root: FiberRootNode
  // lane: Lane
) => {
  const nextLanes = requestUpdateLane()
  if (nextLanes !== SyncLane) {
    // 其他比 SyncLane 更低的优先级
    // NoLane
    ensureRootIsScheduled(root)
    return
  }

  // 根据 fiberRootNode 的 fiber 创建 workInProgress
  prepareFreshStack(root)

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
  // 保存工作结果
  root.finishedWork = finishedWork

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
    console.log(`commit阶段开始 : `, finishedWork)
  }

  // 重置
  root.finishedWork = null

  // 判断是否存在3个子阶段需要执行的操作
  // root flags , root subtreeFlags
  const subtreeFlasg = (finishedWork.subtreeFlags & MutationMask) !== NoFlags

  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags

  if (subtreeFlasg || rootHasEffect) {
    // 执行3个子阶段
    // 1. beforeMutation
    // 2. mutation
    commitMutationEffects(finishedWork)
    // 更换双缓存
    root.current = finishedWork
    // 3. layout
  } else {
    // 更换双缓存
    root.current = finishedWork
  }
}

const workLoop = () => {
  // eslint-disable-next-line no-unmodified-loop-condition
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

const performUnitOfWork = (fiber: FiberNode) => {
  const next = beginWork(fiber)
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
