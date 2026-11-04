import { defineConfig } from '@playwright/test'

import base from './playwright.config.ts'

/** Captures de chaque écran en 360 et 1280 px (npm run e2e:captures), à joindre aux pull requests. */
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: ['**/captures.spec.ts'],
  retries: 0,
})
