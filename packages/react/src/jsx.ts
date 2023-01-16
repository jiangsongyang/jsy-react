import { REACT_ELEMENT_TYPE } from '@jsy-react/shared'
import type { Key, Props, Ref, ReactElement as TReactElement, Type } from '@jsy-react/shared'

export const ReactElement: (type: Type, key: Key, ref: Ref, props: Props) => TReactElement = (
  type: Type,
  key: Key,
  ref: Ref,
  props: Props
) => {
  const element = {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    __logo: 'jsy',
  }

  return element
}

export const jsx = (type: any, config: any, ...maybeChildren: any) => {
  let key: Key = null
  let ref: Ref = null
  const props: Props = {}

  for (const prop in config) {
    if (['key', 'ref'].includes(prop)) {
      if (prop === 'key') {
        key = config[prop]
      } else {
        ref = config[prop]
      }
    }
    if (Object.prototype.hasOwnProperty.call(config, prop)) {
      props[prop] = config[prop]
    }
  }

  const maybeChildrenLength = maybeChildren.length
  if (maybeChildrenLength) {
    props.children = maybeChildrenLength === 1 ? maybeChildren[0] : maybeChildren
  }

  return ReactElement(type, key, ref, props)
}

export const jsxDEV = jsx
