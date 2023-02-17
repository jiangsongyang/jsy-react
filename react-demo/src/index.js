import React from 'react'
import ReactDOM from 'react-dom'

const App = () => (
  <div>
    <span>test child</span>
  </div>
)

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

console.log('React: ', React)
console.log('ReactDOM: ', ReactDOM)
