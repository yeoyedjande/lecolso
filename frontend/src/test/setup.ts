import '@testing-library/jest-dom/vitest'
import '@/app/i18n'

import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { server } from './msw/server'

// Toute requête non simulée fait échouer le test : jamais d'appel réseau réel
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})
afterEach(() => {
  server.resetHandlers()
  cleanup()
  window.localStorage.clear()
})
afterAll(() => {
  server.close()
})
