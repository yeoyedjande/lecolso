import { expect, test } from '@playwright/test'

import { E2E_API_URL } from './api.ts'

test('la page d’accueil affiche l’état de l’API', async ({ page }) => {
  await page.route(`${E2E_API_URL}/health`, (route) =>
    route.fulfill({ json: { status: 'ok', database: 'ok', redis: 'ok' } }),
  )

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Gestion École', level: 1 })).toBeVisible()
  await expect(page.getByText('API : OK')).toBeVisible()
})

test('la page d’accueil signale Redis en erreur', async ({ page }) => {
  await page.route(`${E2E_API_URL}/health`, (route) =>
    route.fulfill({ status: 503, json: { status: 'error', database: 'ok', redis: 'error' } }),
  )

  await page.goto('/')

  await expect(page.getByText('API : indisponible')).toBeVisible()
  await expect(page.getByText('en erreur')).toBeVisible()
})
