import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import BackendProvider from './providers/BackendProvider.jsx'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <BackendProvider>
        <App />
      </BackendProvider>
    </BrowserRouter>
  </StrictMode>
)
