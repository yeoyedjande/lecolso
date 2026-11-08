import { expect, test } from '@playwright/test'

import { ACCOUNTS, mockApi } from './mock-api.ts'
import { DEMO_NOW } from './screens.ts'

const LAURIERS = '0195f000-0000-7000-8000-000000000001'

/** PNG 1 × 1 valide (le navigateur l'envoie tel quel ; l'API réelle le convertit en WebP). */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==',
  'base64',
)

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(DEMO_NOW)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript((school) => {
    window.localStorage.setItem('gestion-ecole.school-id', school)
  }, LAURIERS)
})

test('direction : modifier l’identité de l’école et son logo, visible dans l’en-tête', async ({
  page,
}) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/parametres')

  await expect(page.getByLabel('Nom de l’établissement')).toHaveValue('Les Lauriers')
  await expect(page.getByLabel('Téléphone')).toHaveValue('+225 27 22 41 00 00')
  await page.getByLabel('Nom de l’établissement').fill('Groupe scolaire Les Lauriers')
  await page.getByLabel('Devise').fill('Apprendre ensemble')
  await page.getByLabel('Téléphone').fill('123')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Saisissez un numéro de téléphone valide.')).toBeVisible()
  await page.getByLabel('Téléphone').fill('27 22 41 00 01')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Identité enregistrée').first()).toBeVisible()
  await expect(page.getByLabel('Téléphone')).toHaveValue('+225 27 22 41 00 01')
  // L'en-tête suit le renommage (nom lu dans /me)
  await expect(page.getByRole('banner').getByText('Groupe scolaire Les Lauriers')).toBeVisible()

  // Format refusé avant tout envoi
  await page
    .getByLabel('Choisir un logo')
    .setInputFiles({ name: 'logo.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') })
  await expect(page.getByRole('alert').filter({ hasText: 'Format non accepté' })).toBeVisible()

  await page
    .getByLabel('Choisir un logo')
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByText('Logo enregistré').first()).toBeVisible()
  await expect(
    page.getByRole('banner').getByAltText('Logo de Groupe scolaire Les Lauriers'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Retirer le logo' }).click()
  await expect(page.getByText('Logo retiré').first()).toBeVisible()
  await expect(
    page.getByRole('banner').getByAltText('Logo de Groupe scolaire Les Lauriers'),
  ).toHaveCount(0)
})

test('direction d’un cycle : identité en lecture seule', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.kindergartenDirector })
  await page.goto('/les-lauriers/parametres')

  await expect(
    page.getByText('Seule la direction de tout l’établissement peut modifier son identité.'),
  ).toBeVisible()
  await expect(page.getByLabel('Nom de l’établissement')).toHaveAttribute('readonly', '')
  await expect(page.getByRole('button', { name: 'Choisir un logo' })).toHaveCount(0)
})

test('page publique : devise et coordonnées de l’école', async ({ page }) => {
  await mockApi(page)
  await page.goto('/les-lauriers')

  await expect(page.getByText('Grandir, apprendre, s’épanouir')).toBeVisible()
  const contact = page.getByRole('region', { name: 'Nous contacter' })
  await expect(contact).toContainText('Cocody Angré, 8e tranche, Abidjan')
  await expect(contact.getByRole('link', { name: '+225 27 22 41 00 00' })).toHaveAttribute(
    'href',
    'tel:+2252722410000',
  )
})
