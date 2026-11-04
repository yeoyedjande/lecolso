import { expect, test } from '@playwright/test'

import { ACCOUNTS, mockApi } from './mock-api.ts'
import { DEMO_NOW } from './screens.ts'

const LAURIERS = '0195f000-0000-7000-8000-000000000001'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(DEMO_NOW)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript((school) => {
    window.localStorage.setItem('gestion-ecole.school-id', school)
  }, LAURIERS)
})

test.describe('parcours parent (démo)', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page, { session: ACCOUNTS.guardian })
  })

  test('voir les notes de son enfant en deux écrans', async ({ page }) => {
    await page.goto('/les-lauriers/parent')
    await expect(page.getByRole('heading', { name: 'Bonjour, Kouadio', level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: /Voir la fiche de/ })).toHaveCount(2)

    // Enfant de primaire : carte avec une moyenne
    await page
      .getByRole('link', { name: /Voir la fiche de/ })
      .filter({ hasText: 'Moyenne' })
      .click()
    await expect(page.getByRole('tab', { name: 'Notes' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Moyenne générale')).toBeVisible()
    await expect(page.getByText('Français')).toBeVisible()
  })

  test('payer par Mobile Money (simulé) et obtenir le reçu', async ({ page }) => {
    await page.goto('/les-lauriers/parent/paiements')
    await page.getByRole('button', { name: 'Payer par Mobile Money' }).first().click()

    const sheet = page.getByRole('dialog', { name: 'Payer par Mobile Money' })
    await sheet.getByLabel('Montant (FCFA)').fill('15000')
    await sheet.getByText('Wave').click()
    await sheet.getByRole('button', { name: /^Payer 15/ }).click()

    await expect(sheet.getByText('Validez le paiement sur votre téléphone…')).toBeVisible()
    await expect(sheet.getByText('Paiement réussi')).toBeVisible({ timeout: 10_000 })
    await sheet.getByRole('link', { name: 'Voir le reçu' }).click()
    await expect(page.getByText(/quinze mille francs CFA/)).toBeVisible()
    await expect(page.getByText('Wave')).toBeVisible()
  })

  test('numéro Mobile Money invalide : refusé avant tout paiement', async ({ page }) => {
    await page.goto('/les-lauriers/parent/paiements')
    await page.getByRole('button', { name: 'Payer par Mobile Money' }).first().click()
    const sheet = page.getByRole('dialog', { name: 'Payer par Mobile Money' })
    await sheet.getByLabel('Numéro Mobile Money').fill('1234')
    await sheet.getByRole('button', { name: /^Payer/ }).click()
    await expect(sheet.getByText('Saisissez un numéro ivoirien à 10 chiffres.')).toBeVisible()
  })

  test('justifier une absence depuis l’accueil, en deux écrans', async ({ page }) => {
    await page.goto('/les-lauriers/parent')
    await page.getByRole('link', { name: 'Justifier une absence' }).click()
    await page.getByLabel('Motif').selectOption({ label: 'Rendez-vous médical' })
    await page.getByRole('button', { name: 'Envoyer la justification' }).click()

    await expect(page.getByText(/Merci ! 1 jour\(s\) justifié\(s\)\./).first()).toBeVisible()
    await expect(page).toHaveURL(/\/les-lauriers\/parent$/)
  })

  test('la fiche d’un enfant d’une autre famille est introuvable', async ({ page }) => {
    await page.goto('/les-lauriers/parent/enfants/lau-el-0002')
    await expect(page.getByRole('heading', { name: 'Page introuvable', level: 1 })).toBeVisible()
  })
})

test('enseignante : appel en deux gestes depuis l’accueil', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.teacher })
  await page.goto('/les-lauriers/enseignant')
  await expect(page.getByRole('heading', { name: 'CE1 A' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'CM1 A' })).toBeVisible()

  await page.getByRole('link', { name: 'Faire l’appel' }).first().click()
  await page
    .getByRole('button', { name: /^Absent — / })
    .first()
    .click()
  await page.getByRole('button', { name: 'Enregistrer l’appel' }).click()

  await expect(page.getByText(/Appel enregistré : \d+ absent\(s\)/).first()).toBeVisible()
})

test('enseignante : saisie d’une note sur téléphone', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.teacher })
  await page.goto('/les-lauriers/enseignant/notes')
  const first = page.getByRole('textbox').first()
  await first.fill('16,5')
  await first.blur()
  await expect(page.getByText('Enregistré')).toBeVisible()
})
