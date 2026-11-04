import './index.css'
import './app/i18n'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import { App } from './app/App'

const root = document.getElementById('root')
if (root === null) {
  throw new Error('Élément #root introuvable dans index.html')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker (src/sw.ts) : mise à jour automatique en arrière-plan
registerSW({ immediate: true })
