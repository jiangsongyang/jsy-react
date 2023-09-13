import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

const App = () => {
  const [count, setCount] = useState(100)

  return <div onClick={() => setCount(101)}>{count === 100 ? <Child /> : <>1213</>}</div>
}

const Child = () => {
  return <div>Child</div>
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
