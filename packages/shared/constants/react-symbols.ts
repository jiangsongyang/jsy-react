import { support_symbols } from '../utils'

export const REACT_ELEMENT_TYPE = support_symbols ? Symbol.for('react.element') : 0xeac7

export const REACT_FRAGMENT_TYPE = support_symbols ? Symbol.for('react.fragment') : 0xeacb
