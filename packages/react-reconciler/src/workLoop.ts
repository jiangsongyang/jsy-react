import { beginWork } from './beginWork'
import { commitMutationEffects } from './commitWork'
import { completeWork } from './completeWork'
import { FiberNode, FiberRootNode, createWorkInProgress } from './fiber'
import { MutationMask, NoFlags } from './fiberFlags'
import { HostRoot } from './workTags'

let workInProgress: FiberNode | null = null

// 找到初始化的节点
const prepareFreshStack = (root: FiberRootNode) => {
  workInProgress = createWorkInProgress(root.current, {})
}

export const scheduleUpdateOnFiber = (fiber: FiberNode) => {
  // 调度功能
  // 这个 root 是 fiberRootNode
  const root = markUpdateFromFiberToRoot(fiber)

  renderRoot(root)
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
export const renderRoot = (root: FiberRootNode) => {
  // 初始化
  // 让 workInProgress 指向 第一个 fiberNode 也就是 FiberRootNode
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
