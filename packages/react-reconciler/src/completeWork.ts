// 递归中的归

import { Container, appendInitialChild, createInstance, createTextInstance } from 'hostConfig'
import { updateFiberProps } from 'react-dom/src/SyntheicEvent'
import { FiberNode } from './fiber'
import { popProvider } from './fiberContext'
import { NoFlags, Ref, Update } from './fiberFlags'
import {
  ContextProvider,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from './workTags'

const markUpdate = (fiber: FiberNode) => {
  fiber.flags |= Update
}

function markRef(fiber: FiberNode) {
  fiber.flags |= Ref
}

export const completeWork = (workInProgress: FiberNode) => {
  const newProps = workInProgress.pendingProps
  const current = workInProgress.alternate
  switch (workInProgress.tag) {
    /** 构建 离屏 dom 树 */
    case HostComponent:
      if (current !== null && current.stateNode !== null) {
        // update
        // 判断 props 是否变化
        updateFiberProps(workInProgress.stateNode, newProps)
        // 标记Ref
        if (current.ref !== workInProgress.ref) {
          markRef(workInProgress)
        }
      } else {
        // 构建 DOM
        // 将 DOM 插入到 DOM 树中

        // 创建 宿主环境 实例
        // 对于浏览器 就是 dom 节点
        const instance = createInstance(workInProgress.type, newProps)
        // 将 dom 插入到 dom 树中
        appendAllChildren(instance, workInProgress)
        // 保存实例
        workInProgress.stateNode = instance
        // 标记Ref
        if (workInProgress.ref !== null) {
          markRef(workInProgress)
        }
      }
      bubbleProperties(workInProgress)
      return null
    case HostText:
      if (current !== null && current.stateNode !== null) {
        // update
        const oldText = current.memoizedProps.content
        const newText = newProps.content
        if (oldText !== newText) {
          markUpdate(workInProgress)
        }
      } else {
        // 构建 DOM
        // 将 DOM 插入到 DOM 树中

        // 创建 宿主环境 实例
        // 对于浏览器 就是 dom 节点
        const instance = createTextInstance(newProps.content)
        // 保存实例
        workInProgress.stateNode = instance
      }
      bubbleProperties(workInProgress)
      return null
    case HostRoot:
    case FunctionComponent:
    case Fragment:
      bubbleProperties(workInProgress)
      return null
    case ContextProvider:
      const context = workInProgress.type._context
      popProvider(context)
      bubbleProperties(workInProgress)
      return null
    default:
      if (__DEV__) {
        console.warn(`completeWork 未实现的类型 : `, workInProgress.tag)
      }
      break
  }
}

const appendAllChildren = (parent: Container, workInProgress: FiberNode) => {
  let node = workInProgress.child
  while (node !== null) {
    // 最理想情况
    if (node.tag === HostComponent || node.tag === HostText) {
      // 直接插入到 parent
      appendInitialChild(parent, node.stateNode)
    }
    // 继续往下找
    else if (node.child !== null) {
      node.child.return = node
      node = node.child
      continue
    }

    if (node === workInProgress) {
      return
    }

    // 兄弟节点未空
    // 往上找
    while (node.sibling === null) {
      if (node.return === null || node.return === workInProgress) {
        return
      }
      node = node?.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}

const bubbleProperties = (workInProgress: FiberNode) => {
  let subtreeFlags = NoFlags
  let child = workInProgress.child

  while (child !== null) {
    subtreeFlags |= child.subtreeFlags
    subtreeFlags |= child.flags

    child.return = workInProgress
    child = child.sibling
  }

  workInProgress.subtreeFlags |= subtreeFlags
}
