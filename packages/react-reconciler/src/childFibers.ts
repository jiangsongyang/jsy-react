import { Props, REACT_ELEMENT_TYPE, ReactElement } from '@jsy-react/shared'
import { FiberNode, createFiberFromElement, createWorkInProgress } from './fiber'
import { HostText } from './workTags'
import { ChildDeletion, Placement } from './fiberFlags'

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

  const reconcileSingleElement = (
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    element: ReactElement
  ) => {
    const key = element.key
    work: if (currentFiber !== null) {
      // update
      if (key === currentFiber.key) {
        // key 相同
        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          if (element.type === currentFiber.type) {
            // 如果 type 一样 可复用
            const existing = useFiber(currentFiber, element.props)
            existing.return = returnFiber
            return existing
          } else {
            // 删掉旧的
            deleteChild(returnFiber, currentFiber)
            break work
          }
        } else {
          // 不是 react element
          // 抛出异常
          if (__DEV__) {
            console.warn(`当前 element 不是 reactElement`, element)
          }
          break work
        }
      } else {
        // 删掉旧的
        deleteChild(returnFiber, currentFiber)
      }
    }
    const fiber = createFiberFromElement(element)
    fiber.return = returnFiber
    return fiber
  }

  const reconcileSingleTextNode = (
    returnFiber: FiberNode,
    currrentFiber: FiberNode | null,
    content: string | number
  ) => {
    if (currrentFiber !== null) {
      // update
      if (currrentFiber.tag === HostText) {
        // 类型没变 -- 客服用
        const existing = useFiber(currrentFiber, { content })
        existing.return = returnFiber
        return existing
      }
      // text -> <div>
      deleteChild(returnFiber, currrentFiber)
      // 创建新的 HostText
    }
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
    }
    // 多节点的情况
    // ul -> li * 3
    // 暂不处理

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
