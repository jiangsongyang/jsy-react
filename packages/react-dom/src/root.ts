import { ReactElement } from '@jsy-react/shared'
import { createContainer, updateContainer } from 'react-reconciler/src/fiberReconciler'
import { Container } from './hostConfig'

export const createRoot = (container: Container) => {
  const root = createContainer(container)

  return {
    render(element: ReactElement) {
      return updateContainer(element, root)
    },
  }
}
