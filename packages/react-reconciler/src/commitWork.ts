import {
  Container,
  Instance,
  appendChildToContainer,
  commitUpdate,
  insertChildToContainer,
  removeChild,
} from 'hostConfig'
import { FiberNode, FiberRootNode, PendingPassiveEffects } from './fiber'
import {
  ChildDeletion,
  Flags,
  LayoutMask,
  MutationMask,
  NoFlags,
  PassiveEffect,
  PassiveMask,
  Placement,
  Ref,
  Update,
} from './fiberFlags'
import { Effect, FCUpdateQueue } from './fiberHooks'
import { HookHasEffect } from './hookEffectTags'
import { FunctionComponent, HostComponent, HostRoot, HostText } from './workTags'

let nextEffect: FiberNode | null = null

const commitMutationEffectsOnFiber = (finishedWork: FiberNode, root: FiberRootNode) => {
  const { flags, tag } = finishedWork

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
        commitDeletion(childToDelete, root)
      })
    }
    finishedWork.flags &= ~ChildDeletion
  }
  if ((flags & PassiveEffect) !== NoFlags) {
    // 执行 收集回调
    commitPassiveEffects(finishedWork, root, 'update')
    // 清除 flags
    finishedWork.flags &= ~PassiveEffect
  }
  if ((flags & Ref) !== NoFlags && tag === HostComponent) {
    safelyDetachRef(finishedWork)
  }
}

const commitLayoutEffectsOnFiber = (finishedWork: FiberNode /* root: FiberRootNode */) => {
  const { flags, tag } = finishedWork

  if ((flags & Ref) !== NoFlags && tag === HostComponent) {
    // 绑定新的ref
    safelyAttachRef(finishedWork)
    finishedWork.flags &= ~Ref
  }
}

const commitPassiveEffects = (
  fiber: FiberNode,
  root: FiberRootNode,
  type: keyof PendingPassiveEffects
) => {
  // 不是函数组件 return
  // 或者更新时 没有副作用
  if (
    fiber.tag !== FunctionComponent ||
    (type === 'update' && (fiber.flags & PassiveEffect) === NoFlags)
  ) {
    return
  }

  const updateQueue = fiber.updateQueue as FCUpdateQueue<any>
  if (updateQueue !== null) {
    if (updateQueue.lastEffect === null && __DEV__) {
      console.error(`当 FC 存在 PassiveEffect 时，不应该不存 effect`)
    }
    root.pendingPassiveEffects[type].push(updateQueue.lastEffect!)
  }
}

function safelyAttachRef(fiber: FiberNode) {
  const ref = fiber.ref
  if (ref !== null) {
    const instance = fiber.stateNode
    if (typeof ref === 'function') {
      ref(instance)
    } else {
      ref.current = instance
    }
  }
}

export const commitHookEffectList = (
  flags: Flags,
  lastEffect: Effect,
  callback: (effect: Effect) => void
) => {
  //
  let effect = lastEffect.next
  do {
    if (effect !== null) {
      if ((effect.tag & flags) === flags) {
        callback(effect)
      }
      effect = effect.next
    }
  } while (effect && effect !== lastEffect.next)
}

// 组件卸载
export const commitHookEffectListUnmount = (falgs: Flags, lastEffect: Effect) => {
  commitHookEffectList(falgs, lastEffect, effect => {
    const destroy = effect.destroy
    if (typeof destroy === 'function') {
      destroy()
    }
    effect.tag &= ~HookHasEffect
  })
}

// 触发所有上次更新的 destory
export const commitHookEffectListDestory = (falgs: Flags, lastEffect: Effect) => {
  commitHookEffectList(falgs, lastEffect, effect => {
    const destroy = effect.destroy
    if (typeof destroy === 'function') {
      destroy()
    }
  })
}

// 触发所有上次更新的 create
export const commitHookEffectListCreate = (falgs: Flags, lastEffect: Effect) => {
  commitHookEffectList(falgs, lastEffect, effect => {
    const create = effect.create
    if (typeof create === 'function') {
      effect.destroy = create()
    }
  })
}

const commitPlacement = (finishedWork: FiberNode) => {
  if (__DEV__) {
    console.warn(`执行 placement 操作 : `, finishedWork)
  }
  // parent DOM
  const hostParent = getHostParent(finishedWork)
  // host sibling
  const sibling = getHostSibling(finishedWork)
  // 找 finishedWork 中的 DOM
  if (hostParent) {
    insertOrAppendPlacementNodeIntoContainer(finishedWork, hostParent, sibling)
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

const recordHostChildrenToDelete = (childrenToDelete: FiberNode[], unmountFiber: FiberNode) => {
  // 1. 找到第一个 root host 节点
  const lastOne = childrenToDelete[childrenToDelete.length - 1]
  if (!lastOne) {
    childrenToDelete.push(unmountFiber)
  } else {
    let node = lastOne.sibling
    while (node !== null) {
      if (unmountFiber === node) {
        childrenToDelete.push(node)
      }
      node = node.sibling
    }
  }

  // 2. 每找到一个 host 阶段 判断这个节点是不是第一步找到的节点的兄弟节点
}

const commitDeletion = (childToDelete: FiberNode, root: FiberRootNode) => {
  const rootChildrenToDelete: FiberNode[] = []
  // 递归子树
  commitNestedComponent(childToDelete, unmountFiber => {
    switch (unmountFiber.tag) {
      case HostComponent:
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber)
        // 解绑ref
        safelyDetachRef(unmountFiber)
        return
      case HostText:
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber)
        return
      case FunctionComponent:
        // todo 解绑 ref useEffect unmount
        commitPassiveEffects(unmountFiber, root, 'unmount')
        return
      default:
        if (__DEV__) {
          console.error(`未处理的 unmount 类型`)
        }
    }
  })
  // 移除 DOM
  if (rootChildrenToDelete.length) {
    const hostParent = getHostParent(childToDelete)
    if (hostParent !== null) {
      rootChildrenToDelete.forEach(node => {
        removeChild(node.stateNode, hostParent)
      })
    }
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

const commitEffects = (
  phrase: 'mutation' | 'layout',
  mask: Flags,
  callback: (fiber: FiberNode, root: FiberRootNode) => void
) => {
  return (finishedWork: FiberNode, root: FiberRootNode) => {
    nextEffect = finishedWork

    while (nextEffect !== null) {
      // 向下遍历
      const child: FiberNode | null = nextEffect.child

      if ((nextEffect.subtreeFlags & mask) !== NoFlags && child !== null) {
        nextEffect = child
      } else {
        // 向上遍历
        up: while (nextEffect !== null) {
          callback(nextEffect, root)
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
}

export const commitMutationEffects = commitEffects(
  'mutation',
  MutationMask | PassiveMask,
  commitMutationEffectsOnFiber
)

export const commitLayoutEffects = commitEffects('layout', LayoutMask, commitLayoutEffectsOnFiber)

function safelyDetachRef(current: FiberNode) {
  const ref = current.ref
  if (ref !== null) {
    if (typeof ref === 'function') {
      ref(null)
    } else {
      ref.current = null
    }
  }
}
