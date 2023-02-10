import { ReactElement } from 'packages/shared'
import { createContainer, updateContainer } from 'react-reconciler/src/fiberReconciler'
import { Container } from './hostConfig'

export const createRoot = (container: Container) => {
  const root = createContainer(container)

  return {
    render(element: ReactElement) {
      updateContainer(element, root)
    },
  }
}
