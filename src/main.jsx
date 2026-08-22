import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/index.css'
import '@/globals.css'
import '@/styles/PetPassport.css'
import '@/styles/HealthDataManager.css'
import App from '@/App.jsx'
import { installViewportGuard } from '@/utils/viewportGuard'

// Backstop for the iOS "stuck zoomed-out viewport" bug - see
// src/utils/viewportGuard.js for the full explanation. Installed once,
// before the first render, so it's watching from the very start.
installViewportGuard()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
