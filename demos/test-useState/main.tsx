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
        <>
          <div>2</div>
          <div>
            <>{arr}</>
          </div>
        </>
      </div>
      <div>
        <>
          <div>5</div>
          <div>6</div>
        </>
      </div>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
