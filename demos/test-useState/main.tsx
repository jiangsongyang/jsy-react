import { useState } from 'react'
import ReactDOM from 'react-dom/client'

const App = () => {
  const [count, setCount] = useState(1)

  const arr =
    count % 2 === 0
      ? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
      : [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>]

  return (
    <>
      <div onClick={() => setCount(count + 1)}>
        <>{arr}</>
      </div>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
