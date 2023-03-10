import { ReactElement } from '@jsy-react/shared'
import { createContainer, updateContainer } from 'react-reconciler/src/fiberReconciler'
import { Container } from './hostConfig'
import { initEvent } from './SyntheicEvent'

export const createRoot = (container: Container) => {
  const root = createContainer(container)

  return {
    render(element: ReactElement) {
      initEvent(container, 'click')
      return updateContainer(element, root)
    },
  }
}
