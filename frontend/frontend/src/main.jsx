import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'
import 'leaflet/dist/leaflet.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <Suspense fallback={<div className="flex h-screen items-center justify-center text-emerald-900 font-bold">Loading...</div>}>
        <App />
      </Suspense>
    </HelmetProvider>
  </StrictMode>,
)
