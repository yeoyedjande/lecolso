import { defineConfig } from '@playwright/test'

import base from './playwright.config.ts'

/** Mesure du temps de navigation (npm run e2e:perf), hors CI : conditions ralenties, résultats en console. */
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: ['**/perf.spec.ts'],
  retries: 0,
  reporter: 'list',
})
