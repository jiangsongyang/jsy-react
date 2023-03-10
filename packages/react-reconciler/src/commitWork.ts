import {
  Container,
  Instance,
  appendChildToContainer,
  commitUpdate,
  insertChildToContainer,
  removeChild,
} from 'hostConfig'
import { FiberNode, FiberRootNode } from './fiber'
import { ChildDeletion, MutationMask, NoFlags, Placement, Update } from './fiberFlags'
import { FunctionComponent, HostComponent, HostRoot, HostText } from './workTags'

let nextEffect: FiberNode | null = null

export const commitMutationEffects = (finishedWork: FiberNode) => {
  nextEffect = finishedWork
  while (nextEffect !== null) {
    // 向下遍历
    const child: FiberNode | null = nextEffect.child

    if ((nextEffect.subtreeFlags & MutationMask) !== NoFlags && child !== null) {
      nextEffect = child
    } else {
      // 找到底 或者 不包含 subtreeFlags
      // 向上遍历 DFS

      up: while (nextEffect !== null) {
        commitMutationEffectsOnFiber(nextEffect)
        const sibling: FiberNode | null = nextEffect.sibling

        if (sibling !== null) {
          nextEffect = sibling
          break up
        }

        nextEffect = nextEffect.return
      }
    }
  }
}

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
  const flags = finishedWork.flags

  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork)
    finishedWork.flags &= ~Placement
  }
  if ((flags & Update) !== NoFlags) {
    commitUpdate(finishedWork)
    finishedWork.flags &= ~Update
  }
  if ((flags & ChildDeletion) !== NoFlags) {
    const deletions = finishedWork.deletions
    if (deletions !== null) {
      deletions.forEach(childToDelete => {
        commitDeletion(childToDelete)
      })
    }
    finishedWork.flags &= ~ChildDeletion
  }
}

const commitPlacement = (finishedWork: FiberNode) => {
  if (__DEV__) {
    console.warn(`执行 placement 操作 : `, finishedWork)
  }
  // parent DOM
  const parentHost = getHostParent(finishedWork)
  // host sibling
  const sibling = getHostSibling(finishedWork)
  // 找 finishedWork 中的 DOM
  if (parentHost) {
    insertOrAppendPlacementNodeIntoContainer(finishedWork, parentHost, sibling)
  }
}

const getHostSibling = (fiber: FiberNode) => {
  let node: FiberNode = fiber
  findSibling: while (true) {
    while (node.sibling === null) {
      // 向上找
      const parent = node.return
      if (parent === null || parent.tag === HostComponent || parent.tag === HostRoot) {
        // 没找到
        return null
      }
      node = parent
    }

    node.sibling.return = node.return
    node = node.sibling

    while (node.tag !== HostText && node.tag !== HostComponent) {
      // 向下遍历 找子孙节点
      if ((node.flags & Placement) !== NoFlags) {
        // 说明当前节点已经被标记 需要移动 是不稳定的节点
        // 需要跳过
        continue findSibling
      }
      // 到底了
      if (node.child === null) {
        continue findSibling
      } else {
        node.child.return = node
        node = node.child
      }
    }
    if ((node.flags & Placement) === NoFlags) {
      // return 目标的 host 类型节点
      return node.stateNode
    }
  }
}

const commitDeletion = (childToDelete: FiberNode) => {
  let rootHostNode: FiberNode | null = null
  // 递归子树
  commitNestedComponent(childToDelete, unmountFiber => {
    switch (unmountFiber.tag) {
      case HostComponent:
        if (rootHostNode === null) {
          rootHostNode = unmountFiber
        }
        // todo 解绑 ref
        return
      case HostText:
        if (rootHostNode === null) {
          rootHostNode = unmountFiber
        }
        return
      case FunctionComponent:
        // todo 解绑 ref useEffect unmount
        return
      default:
        if (__DEV__) {
          console.error(`未处理的 unmount 类型`)
        }
    }
  })
  // 移除 DOM
  if (rootHostNode !== null) {
    const hostParent = getHostParent(childToDelete)
    if (hostParent) removeChild((rootHostNode as FiberNode).stateNode, hostParent)
  } else {
    if (__DEV__) {
      console.warn(`没有找到 rootHostNode`)
    }
  }
  childToDelete.return = null
  childToDelete.child = null
}

const commitNestedComponent = (root: FiberNode, onCommitUnmount: (fiber: FiberNode) => void) => {
  let node = root
  while (true) {
    onCommitUnmount(node)
    if (node.child !== null) {
      // 向下遍历的过程
      node.child.return = node
      node = node.child
      continue
    }
    if (node === root) {
      return
    }
    while (node.sibling === null) {
      if (node.return === null || node.return === root) {
        return
      }
      // 向上归
      node = node.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}

const getHostParent = (fiber: FiberNode) => {
  let parent = fiber.return

  while (parent) {
    const parentTag = parent.tag
    if (parentTag === HostComponent) {
      return parent.stateNode as Container
    }
    if (parentTag === HostRoot) {
      return (parent.stateNode as FiberRootNode).container
    }
    parent = parent.return
  }
  if (__DEV__) {
    console.warn(`未找到 parentHost : `, fiber)
  }
  return null
}

const insertOrAppendPlacementNodeIntoContainer = (
  finishedWork: FiberNode,
  hostParent: Container,
  before?: Instance
) => {
  // fiber -> host fiber
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    if (before) {
      insertChildToContainer(finishedWork.stateNode, hostParent, before)
    } else {
      appendChildToContainer(hostParent, finishedWork.stateNode)
    }
    return
  }
  const child = finishedWork.child
  if (child !== null) {
    insertOrAppendPlacementNodeIntoContainer(child, hostParent)
    let sibling = child.sibling
    while (sibling !== null) {
      insertOrAppendPlacementNodeIntoContainer(sibling, hostParent)
      sibling = sibling.sibling
    }
  }
}
