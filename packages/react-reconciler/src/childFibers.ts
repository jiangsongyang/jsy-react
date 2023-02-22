import { REACT_ELEMENT_TYPE, ReactElement } from '@jsy-react/shared'
import { FiberNode, createFiberFromElement } from './fiber'
import { HostText } from './workTags'
import { Placement } from './fiberFlags'

export const childReconciler = (shouldTrackEffects: boolean) => {
  const reconcileSingleElement = (
    returnFiber: FiberNode,
    currrentFiber: FiberNode | null,
    element: ReactElement
  ) => {
    const fiber = createFiberFromElement(element)
    fiber.return = returnFiber
    return fiber
  }

  const reconcileSingleTextNode = (
    returnFiber: FiberNode,
    currrentFiber: FiberNode | null,
    content: string | number
  ) => {
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

    if (__DEV__) {
      console.warn(`未实现的边界情况 ：`, newChild)
    }

    return null
  }
}

export const reconcileChildFibers = childReconciler(true)

export const mountChildFibers = childReconciler(false)
