import { defineConfig, devices } from '@playwright/test'

import { E2E_API_URL } from './e2e/api.ts'

// Navigateur déjà installé ailleurs (ex. conteneur CI) : chemin de l'exécutable Chromium
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
const launchOptions = executablePath !== undefined ? { launchOptions: { executablePath } } : {}

export default defineConfig({
  testDir: './e2e',
  // Captures d'écran : configuration à part (playwright.captures.config.ts)
  testIgnore: ['**/captures.spec.ts', '**/perf.spec.ts'],
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
      // Parents et enseignants : téléphone d'entrée de gamme, 360 px
      name: 'mobile-360',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 780 }, ...launchOptions },
    },
    {
      // Back-office : poste de bureau, 1280 px
      name: 'desktop-1280',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        ...launchOptions,
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: process.env.CI === undefined,
    // Build de recette : /design présente, données de démonstration activées
    env: { VITE_API_URL: E2E_API_URL, VITE_APP_ENV: 'staging', VITE_DEMO_MODULES: 'true' },
    timeout: 120_000,
  },
})
