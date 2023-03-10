import { Container } from 'hostConfig'
import { Props } from 'shared'

export const ELEMENT_PROPS_KEY = '__ELEMENT_PROPS_KEY__'

export interface DOMElement extends Element {
  [ELEMENT_PROPS_KEY]: Props
}

type EventCallback = (e: Event) => void

export interface Paths {
  capture: EventCallback[]
  bubble: EventCallback[]
}

export interface SyntheicEvent extends Event {
  __stopPropagation: boolean
}

export const updateFiberProps = (node: DOMElement, props: Props) => {
  node[ELEMENT_PROPS_KEY] = props
}

const validEventTypeList = ['click']

export const initEvent = (container: Container, eventType: string) => {
  if (!validEventTypeList.includes(eventType)) {
    console.warn(`不支持的事件类型: ${eventType}`)
    return
  }
  if (__DEV__) {
    console.log(`initEvent: ${eventType}`)
  }
  container.addEventListener(eventType, e => {
    dispatchEvent(container, eventType, e)
  })
}

const dispatchEvent = (container: Container, eventType: string, event: Event) => {
  const targetElement = event.target
  if (targetElement === null) {
    console.warn(`事件不存在 target`, event)
    return
  }

  // 1. 收集沿途的事件
  const { bubble, capture } = collectPaths(targetElement as DOMElement, container, eventType)
  // 2. 构造合成事件
  const se = createSyntheticEvent(event)
  // 3. 遍历 capture 和 bubble 阶段的事件
  triggerEventFlow(capture, se)
  if (!se.__stopPropagation) {
    triggerEventFlow(bubble, se)
  }
}

const getEventCallbackNameFromEventType = (eventType: string) => {
  return {
    click: ['onClickCapture', 'onClick'],
  }[eventType]
}

const collectPaths = (targetElement: DOMElement, container: Container, eventType: string) => {
  const paths: Paths = {
    capture: [],
    bubble: [],
  }
  while (targetElement && targetElement !== container) {
    // 收集的过程
    const elementProps = targetElement[ELEMENT_PROPS_KEY]
    if (elementProps) {
      const callBackNameList = getEventCallbackNameFromEventType(eventType)
      if (callBackNameList) {
        callBackNameList.forEach((callbackName, i) => {
          const eventCallback = elementProps[callbackName]
          if (eventCallback) {
            if (i === 0) {
              // 反向插入
              paths.capture.unshift(eventCallback)
            } else {
              paths.bubble.push(eventCallback)
            }
          }
        })
      }
    }
    targetElement = targetElement.parentNode as DOMElement
  }

  return paths
}

const createSyntheticEvent = (event: Event) => {
  const syntheticEvent = event as SyntheicEvent
  syntheticEvent.__stopPropagation = false
  const orignaStopPropagation = event.stopPropagation

  syntheticEvent.stopPropagation = () => {
    if (orignaStopPropagation) {
      orignaStopPropagation()
    }
  }

  return syntheticEvent
}

const triggerEventFlow = (paths: EventCallback[], se: SyntheicEvent) => {
  for (let i = 0; i < paths.length; i++) {
    const callback = paths[i]
    callback(se)
    if (se.__stopPropagation) {
      break
    }
  }
}
