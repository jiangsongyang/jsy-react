import { beginWork } from './beginWork'
import { completeWork } from './completeWork'
import { FiberNode, FiberRootNode, createWorkInProgress } from './fiber'
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

export const renderRoot = (root: FiberRootNode) => {
  // 初始化
  // 让 workInProgress 指向 第一个 fiberNode 也就是 FiberRootNode
  prepareFreshStack(root)

  do {
    try {
      workLoop()
      break
    } catch (e) {
      console.warn(`work loop error :`, e)
      workInProgress = null
    }
  } while (true)
}

const workLoop = () => {
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
    completeWork()
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
