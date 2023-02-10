import React from 'react'
import ReactDOM from 'react-dom'

const jsx = (
  <div>
    <span>test child</span>
  </div>
)

ReactDOM.createRoot(document.getElementById('root')).render(jsx)

console.log('React: ', React)
console.log('ReactDOM: ', ReactDOM)
console.log('JSX: ', jsx)
