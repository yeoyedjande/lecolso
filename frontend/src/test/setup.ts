import '@testing-library/jest-dom/vitest'
import '@/app/i18n'

import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'

import { server } from './msw/server'

// jsdom n'implémente pas ResizeObserver, utilisé par Radix (case à cocher, menus) : observateur inerte
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)

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
