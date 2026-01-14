import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <h1 className="text-4xl font-bold text-blue-600">
      Tailwind v4 is working
    </h1>
  </StrictMode>
)
