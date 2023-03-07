import { useState } from 'react'
import ReactDOM from 'react-dom/client'

const App = () => {
  const [count, setCount] = useState(1)

  window.setCount = setCount

  return count === 3 ? <Child /> : <div>{count}</div>
}

const Child = () => {
  return <div>this is child</div>
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
