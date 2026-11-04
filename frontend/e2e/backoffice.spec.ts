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

test('encaissement au guichet (démo) : recherche, montant, confirmation, reçu imprimable', async ({
  page,
}) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/gestion/encaissements')

  await page.getByRole('searchbox', { name: /Rechercher l’élève/ }).fill('LAU-2026-0001')
  await page.getByRole('button', { name: /^Choisir / }).click()
  await expect(page.getByText('Reste à payer sur l’année')).toBeVisible()

  const amount = page.getByLabel('Montant reçu (FCFA)')
  await amount.fill('0')
  await page.getByRole('button', { name: /^Encaisser/ }).click()
  await expect(page.getByText('Saisissez un montant entier supérieur à zéro.')).toBeVisible()

  await amount.fill('25 000')
  await page.getByText('Orange Money').click()
  await page.getByRole('button', { name: /^Encaisser 25/ }).click()
  await expect(
    page.getByText('La référence est obligatoire pour ce moyen de paiement.'),
  ).toBeVisible()
  await page.getByLabel('Référence de la transaction').fill('MP26110400123')
  await page.getByRole('button', { name: /^Encaisser 25/ }).click()

  const dialog = page.getByRole('dialog', { name: 'Confirmer l’encaissement' })
  await expect(dialog).toContainText('Orange Money')
  await dialog.getByRole('button', { name: 'Confirmer et émettre le reçu' }).click()

  await expect(page.getByText('Paiement enregistré')).toBeVisible()
  await expect(page.getByText(/Reçu REC-2026-\d{6}/)).toBeVisible()
  await page.getByRole('link', { name: 'Imprimer le reçu' }).click()
  await expect(page.getByText('vingt-cinq mille francs CFA', { exact: false })).toBeVisible()
  await expect(page.getByText('MP26110400123')).toBeVisible()

  // Le paiement apparaît dans la caisse du jour
  await page.getByRole('link', { name: 'Retour' }).click()
  await expect(page.getByRole('heading', { name: 'Caisse du jour', level: 1 })).toBeVisible()
  await expect(page.getByText('Orange Money').first()).toBeVisible()
})

test('appel de classe (démo) : absent en un geste, enregistrement', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/gestion/presences')

  // Classes en appel uniquement (la crèche est en arrivées/départs, paramètre du cycle)
  const picker = page.getByRole('combobox', { name: 'Classe' })
  await expect(picker.locator('option', { hasText: 'Crèche' })).toHaveCount(0)
  await picker.selectOption({ label: 'CE2 A' })
  await expect(page.getByText(/présent\(s\)/)).toBeVisible()

  await page.getByRole('button', { name: 'Tous présents' }).click()
  await expect(page.getByText(/· 0 absent\(s\) ·/)).toBeVisible()
  const firstAbsent = page.getByRole('button', { name: /^Absent — / }).first()
  await firstAbsent.click()
  await expect(firstAbsent).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/· 1 absent\(s\) ·/)).toBeVisible()

  await page.getByRole('button', { name: 'Enregistrer l’appel' }).click()
  await expect(page.getByText('Appel enregistré : 1 absent(s)', { exact: true })).toBeVisible()
  await expect(page.getByText(/Appel fait par Yao Directeur/)).toBeVisible()
})

test('saisie des notes au clavier : Entrée descend, note invalide signalée', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/gestion/notes')
  await expect(page.getByText('Évaluation 1').first()).toBeVisible()

  const cells = page.getByRole('textbox', { name: /^Note de .*, Évaluation 1$/ })
  await cells.first().fill('21')
  await expect(cells.first()).toHaveAttribute('aria-invalid', 'true')
  await cells.first().fill('15,5')
  await cells.first().press('Enter')
  await expect(cells.nth(1)).toBeFocused()
  await expect(cells.first()).toHaveAttribute('aria-invalid', 'false')
  await expect(page.getByText('Enregistré')).toBeVisible()
})

test('promoteur (consultation des notes) : grille en lecture seule', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.promoter })
  await page.goto('/gestion/notes')
  const cell = page.getByRole('textbox', { name: /^Note de .*, Évaluation 1$/ }).first()
  await expect(cell).toHaveAttribute('readonly', '')
  await expect(page.getByRole('button', { name: 'Nouvelle évaluation' })).toHaveCount(0)
})

test('comptabilité : finances visibles, inscription et paramètres fermés', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.accountant })
  await page.goto('/gestion/eleves')
  await expect(page.getByRole('heading', { name: 'Élèves', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Inscrire un élève' })).toHaveCount(0)

  await page.goto('/gestion/inscriptions')
  await expect(page.getByRole('heading', { name: 'Accès réservé', level: 1 })).toBeVisible()
})

test('directrice limitée à la maternelle : seuls les élèves de maternelle', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.kindergartenDirector })
  await page.goto('/gestion/eleves')

  const cycle = page.getByRole('combobox', { name: 'Cycle' })
  await expect(cycle.locator('option')).toHaveText(['Tous les cycles', 'Maternelle'])
  await expect(page.getByText(/^\d+ élèves$/)).toBeVisible()
  await expect(page.getByText(/^CE1 A$/)).toHaveCount(0)
})
