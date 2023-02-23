import { FiberNode } from 'react-reconciler/src/fiber'
import { HostText } from 'react-reconciler/src/workTags'

export type Container = Element
export type Instance = Element
export type TextInstance = Text

export const createInstance = (
  type: string,
  /* eslint-disable @typescript-eslint/no-unused-vars */
  props: any
): Instance => {
  const element = document.createElement(type)
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
