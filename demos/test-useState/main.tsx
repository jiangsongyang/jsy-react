import { useState } from 'react'
import ReactDOM from 'react-dom/client'

const App = () => {
  return (
    <div>
      <Child />
    </div>
  )
}

const Child = () => {
  const [count, setCount] = useState(0)

  window.setCount = setCount

  return <div>{count}</div>
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
