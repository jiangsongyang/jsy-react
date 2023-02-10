import reactConfig from './react.config.js'
import reactDomConfig from './react-dom.config.js'

export default () => {
  return [...reactConfig, ...reactDomConfig]
}
