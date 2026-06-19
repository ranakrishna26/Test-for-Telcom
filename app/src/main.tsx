import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'mapbox-gl/dist/mapbox-gl.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="dark h-full">
      <App />
    </div>
  </StrictMode>,
)
