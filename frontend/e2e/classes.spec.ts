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

test('direction : créer, modifier et supprimer une classe de l’année en cours', async ({
  page,
}) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/classes')

  await expect(page.getByText('Organisation de l’année 2026-2027', { exact: false })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'CE1 A', level: 3 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'CE1 B', level: 3 })).toBeVisible()
  await expect(page.getByText('Fatou Enseignante')).toHaveCount(2)

  // Création : section en double refusée par l'API, puis classe C
  await page.getByRole('button', { name: 'Nouvelle classe' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Niveau').selectOption({ label: 'CE1 · Primaire' })
  await sheet.getByLabel('Section').fill('b')
  await sheet.getByRole('button', { name: 'Enregistrer la classe' }).click()
  await expect(sheet.getByText('Cette classe existe déjà pour ce niveau.')).toBeVisible()
  await sheet.getByLabel('Section').fill('c')
  await sheet.getByLabel('Capacité').fill('30')
  await sheet.getByLabel('Salle').fill('Salle 12')
  await sheet.getByLabel('Enseignant(e) titulaire').selectOption({ label: 'Fatou Enseignante' })
  await sheet.getByRole('button', { name: 'Enregistrer la classe' }).click()
  await expect(page.getByText('Classe CE1 C créée').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'CE1 C', level: 3 })).toBeVisible()
  await expect(page.getByText('Salle 12')).toBeVisible()

  // Modification
  await page.getByRole('button', { name: 'Modifier CE1 C' }).click()
  await page.getByRole('dialog').getByLabel('Salle').fill('Salle 14')
  await page.getByRole('dialog').getByRole('button', { name: 'Enregistrer la classe' }).click()
  await expect(page.getByText('Classe CE1 C enregistrée').first()).toBeVisible()
  await expect(page.getByText('Salle 14')).toBeVisible()

  // Suppression avec confirmation
  await page.getByRole('button', { name: 'Supprimer CE1 C' }).click()
  await page.getByRole('button', { name: 'Supprimer la classe' }).click()
  await expect(page.getByText('Classe CE1 C supprimée').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'CE1 C', level: 3 })).toHaveCount(0)
})

test('direction de la maternelle : gère les classes de son cycle seulement', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.kindergartenDirector })
  await page.goto('/les-lauriers/classes')

  await expect(page.getByRole('heading', { name: 'PS A', level: 3 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Modifier PS A' })).toBeVisible()
  // Hors de son cycle : ni visible ni modifiable
  await expect(page.getByRole('heading', { name: 'CE1 A', level: 3 })).toHaveCount(0)

  await page.getByRole('button', { name: 'Nouvelle classe' }).click()
  const levels = page.getByRole('dialog').getByLabel('Niveau').locator('option')
  await expect(levels).toHaveText([
    'Choisir un niveau',
    'Petite section · Maternelle',
    'Moyenne section · Maternelle',
    'Grande section · Maternelle',
  ])
})

test('secrétariat : consulte les classes sans pouvoir les modifier', async ({ page }) => {
  // Secrétariat (lecture des paramètres seulement), mot de passe déjà choisi
  await mockApi(page, { session: { ...ACCOUNTS.provisional, mustChangePassword: false } })
  await page.goto('/les-lauriers/classes')

  await expect(page.getByRole('heading', { name: 'CM1 A', level: 3 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nouvelle classe' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Modifier / })).toHaveCount(0)
})

test('direction : préparer une année scolaire puis en faire l’année en cours', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/parametres')
  await page.getByRole('tab', { name: 'Années scolaires' }).click()

  const list = page.getByRole('list', { name: 'Années scolaires' })
  await expect(list.getByRole('listitem')).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'Clôturer' }).first()).toBeDisabled()

  // Proposition par défaut : l'année qui suit la plus récente
  await expect(page.getByLabel('Année', { exact: true })).toHaveValue('2027-2028')
  await page.getByLabel('Année', { exact: true }).fill('2027-2029')
  await page.getByRole('button', { name: 'Créer l’année' }).click()
  await expect(page.getByText('Indiquez deux années qui se suivent')).toBeVisible()
  await page.getByLabel('Année', { exact: true }).fill('2027-2028')
  await page.getByRole('button', { name: 'Créer l’année' }).click()
  await expect(page.getByText('Année 2027-2028 créée').first()).toBeVisible()
  await expect(list.getByRole('listitem')).toHaveCount(3)

  await list
    .getByRole('listitem')
    .filter({ hasText: '2027-2028' })
    .getByRole('button', { name: 'Définir comme année en cours' })
    .click()
  await expect(page.getByText('2027-2028 est l’année en cours').first()).toBeVisible()

  // Les classes suivent l'année en cours : la nouvelle n'en a pas encore
  await page.goto('/les-lauriers/classes')
  await expect(page.getByText('Aucune classe', { exact: true })).toBeVisible()
})
