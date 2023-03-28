import { FiberNode } from 'react-reconciler/src/fiber'
import { HostComponent, HostText } from 'react-reconciler/src/workTags'
import { Props } from 'shared'
import { updateFiberProps } from './SyntheicEvent'
import type { DOMElement } from './SyntheicEvent'

export type Container = Element
export type Instance = Element
export type TextInstance = Text

export const createInstance = (type: string, props: Props): Instance => {
  const element = document.createElement(type) as unknown as DOMElement
  // mount 时记录 props
  updateFiberProps(element, props)
  return element
}

export const appendInitialChild = (parent: Instance | Container, child: Instance) => {
  parent.appendChild(child)
}

export const createTextInstance = (content: string) => {
  return document.createTextNode(content)
}

export const appendChildToContainer = (parent: Instance | Container, child: Instance) => {
  parent.appendChild(child)
}

export const commitUpdate = (fiber: FiberNode) => {
  switch (fiber.tag) {
    case HostText:
      const text = fiber.memoizedProps.content
      return commitTextUpdatevalue(fiber.stateNode, text)
    case HostComponent:
      updateFiberProps(fiber.stateNode, fiber.memoizedProps)
      return
    default:
      if (__DEV__) {
        console.error(`未实现的 update 类型`)
      }
      break
  }
}

export const commitTextUpdatevalue = (textInstance: TextInstance, content: string) => {
  textInstance.textContent = content
}

export const removeChild = (child: Instance | TextInstance, container: Container) => {
  container.removeChild(child)
}

export const insertChildToContainer = (child: Instance, container: Container, before: Instance) => {
  container.insertBefore(child, before)
}

export const scheduleMicroTask =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : typeof Promise === 'function'
    ? (callback: (...args: any) => void) => Promise.resolve().then(callback)
    : setTimeout
