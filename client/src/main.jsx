import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Suppress specific warnings
const originalWarn = console.warn
console.warn = (...args) => {
  const msg = args.join(' ')
  if (msg.includes('React Router Future Flag') || 
      msg.includes('v7_relativeSplatPath') ||
      msg.includes('v7_startTransition')) {
    return
  }
  originalWarn(...args)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)