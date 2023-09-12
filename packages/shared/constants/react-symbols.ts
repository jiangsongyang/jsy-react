import { support_symbols } from '../utils'

export const REACT_ELEMENT_TYPE = support_symbols ? Symbol.for('react.element') : 0xeac7

export const REACT_FRAGMENT_TYPE = support_symbols ? Symbol.for('react.fragment') : 0xeacb

export const REACT_CONTEXT_TYPE = support_symbols ? Symbol.for('react.context') : 0xeacc

export const REACT_PROVIDER_TYPE = support_symbols ? Symbol.for('react.provider') : 0xeac2

export const REACT_SUSPENSE_TYPE = support_symbols ? Symbol.for('react.suspense') : 0xead1
