import { defineConfig, devices } from '@playwright/test'

import { E2E_API_URL } from './e2e/api.ts'

// Navigateur déjà installé ailleurs (ex. conteneur CI) : chemin de l'exécutable Chromium
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: process.env.CI !== undefined,
  retries: process.env.CI !== undefined ? 1 : 0,
  reporter: process.env.CI !== undefined ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'fr-FR',
    timezoneId: 'Africa/Abidjan',
    // Le service worker contournerait page.route : bloqué pendant les tests
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7'],
        ...(executablePath !== undefined ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: process.env.CI === undefined,
    env: { VITE_API_URL: E2E_API_URL },
    timeout: 120_000,
  },
})
