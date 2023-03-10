import { Props, REACT_ELEMENT_TYPE, ReactElement } from '@jsy-react/shared'
import { FiberNode, createFiberFromElement, createWorkInProgress } from './fiber'
import { HostText } from './workTags'
import { ChildDeletion, Placement } from './fiberFlags'

type ExistingChildren = Map<string | number, FiberNode>

export const childReconciler = (shouldTrackEffects: boolean) => {
  const deleteChild = (returnFiber: FiberNode, childToDelete: FiberNode) => {
    if (!shouldTrackEffects) return
    const deletions = returnFiber.deletions
    if (deletions === null) {
      returnFiber.deletions = [childToDelete]
      returnFiber.flags |= ChildDeletion
    } else {
      deletions.push(childToDelete)
    }
  }

  const deleteRemainingChildren = (returnFiber: FiberNode, currentFirstChild: FiberNode | null) => {
    if (!shouldTrackEffects) {
      return
    }
    let childToDelete = currentFirstChild
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete)
      childToDelete = childToDelete.sibling
    }
  }

  const reconcileSingleElement = (
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    element: ReactElement
  ) => {
    const key = element.key
    /**
     * 四种可能性
     * 1. key 相同 type 相同 可复用
     * 2. key 相同 type 不同 不可复用
     * 3. key 不同 type 相同 不可复用
     * 4. key 不同 type 不同 不可复用
     */
    // update
    // 寻找可复用节点
    while (currentFiber !== null) {
      if (key === currentFiber.key) {
        // 1. key 相同 type 相同 可复用
        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          if (element.type === currentFiber.type) {
            // 如果 type 一样 可复用
            const existing = useFiber(currentFiber, element.props)
            existing.return = returnFiber
            // 当前节点可复用 标记剩下的节点
            deleteRemainingChildren(returnFiber, currentFiber.sibling)
            return existing
          } else {
            // 2. key 相同 type 不同 不可复用
            // 删掉所有旧的
            deleteRemainingChildren(returnFiber, currentFiber)
            break
          }
        } else {
          // 不是 react element
          // 抛出异常
          if (__DEV__) {
            console.warn(`当前 element 不是 reactElement`, element)
          }
          break
        }
      } else {
        // key 不同
        deleteChild(returnFiber, currentFiber)
        currentFiber = currentFiber.sibling
      }
    }
    // 如果都没有复用的
    // 就创建一个新的
    const fiber = createFiberFromElement(element)
    fiber.return = returnFiber
    return fiber
  }

  const reconcileSingleTextNode = (
    returnFiber: FiberNode,
    currrentFiber: FiberNode | null,
    content: string | number
  ) => {
    while (currrentFiber !== null) {
      // update
      if (currrentFiber.tag === HostText) {
        // 类型没变 -- 可复用
        const existing = useFiber(currrentFiber, { content })
        existing.return = returnFiber
        return existing
      }
      deleteChild(returnFiber, currrentFiber)
      currrentFiber = currrentFiber.sibling
    }
    // 都不能复用
    const fiber = new FiberNode(HostText, { content }, null)

    fiber.return = returnFiber
    return fiber
  }

  const placeSingleChild = (fiber: FiberNode) => {
    // 需要追踪 && 首屏渲染
    if (shouldTrackEffects && fiber.alternate === null) {
      fiber.flags = Placement
    }
    return fiber
  }

  const reconcileChildrenArray = (
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChild: any[]
  ) => {
    // 最后一个可复用 fiber 在 current 中的索引位置
    let lastPlacedIndex = 0
    // 创建的最后一个 fiber
    let lastNewFiber: FiberNode | null = null
    // 创建的第一个 fiber
    let firstNewFiber: FiberNode | null = null

    // 1. 将 current 保存在 map 中
    const existingChildren: ExistingChildren = new Map()
    let current = currentFirstChild
    while (current !== null) {
      const keyToUse = current.key !== null ? current.key : current.index
      existingChildren.set(keyToUse, current)
      current = current.sibling
    }
    // 2. 遍历 newChild 寻找可复用节点
    for (let i = 0; i < newChild.length; i++) {
      const after = newChild[i]
      // 获取的可能是 复用的fiber 或者 创建的新fiber
      const newFiber = updateFromMap(returnFiber, existingChildren, i, after)
      if (newFiber === null) continue
      // 3. 标记移动还是插入
      newFiber.index = i
      newFiber.return = returnFiber
      if (lastNewFiber === null) {
        lastNewFiber = newFiber
        firstNewFiber = newFiber
      } else {
        lastNewFiber.sibling = newFiber
        lastNewFiber = lastNewFiber.sibling
      }

      if (!shouldTrackEffects) continue

      const current = newFiber.alternate
      if (current !== null) {
        const oldIndex = current.index
        if (oldIndex < lastPlacedIndex) {
          // 需要移动
          newFiber.flags |= Placement
          continue
        } else {
          // 不需要移动
          lastPlacedIndex = oldIndex
        }
      } else {
        // mount
        // 需要插入
        newFiber.flags |= Placement
      }
    }
    // 4. 将 map 中剩下的节点标记为删除
    existingChildren.forEach(child => {
      deleteChild(returnFiber, child)
    })

    return firstNewFiber
  }

  const updateFromMap = (
    returnFiber: FiberNode,
    existingChildren: ExistingChildren,
    index: number,
    element: any
  ) => {
    const keyToUse = element.key !== null ? element.key : index
    const before = existingChildren.get(keyToUse)
    if (typeof element === 'string' || typeof element === 'number') {
      // HOST_TEXT 可复用
      if (before) {
        if (before.tag === HostText) {
          existingChildren.delete(keyToUse)
          return useFiber(before, { content: element })
        }
      }
      return new FiberNode(HostText, { content: element }, null)
    }
    // element 是 react element 类型
    if (typeof element === 'object' && element !== null) {
      switch (element.$$typeof) {
        case REACT_ELEMENT_TYPE:
          if (before) {
            // key 相同 type 相同 可复用
            if (before.type === element.type) {
              existingChildren.delete(keyToUse)
              return useFiber(before, element.props)
            }
          }
          return createFiberFromElement(element)
      }
    }
    // TODO element 是数组
    if (Array.isArray(element) && __DEV__) {
      console.warn(`暂未实现数组类型的 child`)
    }
    return null
  }

  return function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild?: ReactElement
  ) {
    // 判断当前 fiber 的类型
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(reconcileSingleElement(returnFiber, currentFiber, newChild))

        default:
          if (__DEV__) {
            console.warn(`未实现的边界情况 ：`, newChild)
          }
          break
      }
      // 多节点的情况
      // ul -> li * 3
      if (Array.isArray(newChild)) {
        return reconcileChildrenArray(returnFiber, currentFiber, newChild)
      }
    }

    // 文本节点
    if (typeof newChild === 'string' || typeof newChild === 'number') {
      return placeSingleChild(reconcileSingleTextNode(returnFiber, currentFiber, newChild))
    }

    // 兜底的情况
    if (currentFiber) {
      deleteChild(returnFiber, currentFiber)
    }

    if (__DEV__) {
      console.warn(`未实现的边界情况 ：`, newChild)
    }

    return null
  }
}

const useFiber = (fiber: FiberNode, pendingProps: Props) => {
  const clone = createWorkInProgress(fiber, pendingProps)
  clone.index = 0
  clone.sibling = null
  return clone
}

export const reconcileChildFibers = childReconciler(true)

export const mountChildFibers = childReconciler(false)
