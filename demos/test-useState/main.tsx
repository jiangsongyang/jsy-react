import { useState } from 'react'
import ReactDOM from 'react-dom/client'

const App = () => {
  const [count, setCount] = useState(100)

  return (
    <>
      <div
        onClick={() => {
          setCount(count => count + 1)
          setCount(count => count + 1)
          setCount(count => count + 1)
        }}>
        <>{count}</>
      </div>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
