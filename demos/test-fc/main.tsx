import React from 'react'
import ReactDOM from 'react-dom/client'

const App = () => (
  <div>
    <Child />
  </div>
)

const Child = () => {
  return <div>Child</div>
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
