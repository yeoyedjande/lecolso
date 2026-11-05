import { expect, test } from '@playwright/test'

import { ACCOUNTS, lauriersStudentId, mockApi } from './mock-api.ts'
import { DEMO_NOW } from './screens.ts'

const LAURIERS = '0195f000-0000-7000-8000-000000000001'
/** Enfant du compte parent de démonstration aux Lauriers (CE1 A ; son frère Junior est en CP1 A). */
const ANGE = lauriersStudentId(23)

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(DEMO_NOW)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript((school) => {
    window.localStorage.setItem('gestion-ecole.school-id', school)
  }, LAURIERS)
})

test('liste paginée, recherche serveur et filtre par classe', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/les-lauriers/eleves')

  await expect(page.getByText('25 élèves affichés, d’autres suivent')).toBeVisible()
  await page.getByRole('button', { name: 'Afficher plus' }).click()
  await expect(page.getByText('35 élèves', { exact: true })).toBeVisible()

  await page.getByRole('searchbox', { name: /Rechercher un élève/ }).fill('kouadio')
  await expect(page.getByText('2 élèves', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /KOUADIO Ange/ })).toBeVisible()

  await page.getByRole('searchbox', { name: /Rechercher un élève/ }).fill('')
  await page.getByRole('combobox', { name: 'Classe' }).selectOption({ label: 'CE1 B' })
  await expect(page.getByText('3 élèves', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/classe=/)
})

test('fiche : identité, données médicales, parents et fratrie', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto(`/les-lauriers/eleves/${ANGE}`)

  await expect(page.getByRole('heading', { name: 'KOUADIO Ange', level: 1 })).toBeVisible()
  await expect(page.getByText('LAU-000023').first()).toBeVisible()
  await expect(page.getByText('Informations médicales')).toBeVisible()
  await page.getByRole('link', { name: /KOUADIO Junior/ }).click()
  await expect(page.getByRole('heading', { name: 'KOUADIO Junior', level: 1 })).toBeVisible()

  await page.getByRole('tab', { name: 'Parents' }).click()
  await expect(page.getByText('Kouadio Parent')).toBeVisible()
  await expect(page.getByText('Payeur', { exact: true })).toBeVisible()
})

test('comptabilité : fiche en lecture, sans données médicales', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.accountant })
  await page.goto(`/les-lauriers/eleves/${lauriersStudentId(4)}`)

  await expect(page.getByText('Matricule').first()).toBeVisible()
  await expect(page.getByText('Informations médicales')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Modifier' })).toHaveCount(0)
})

test('direction de la maternelle : un élève du primaire est introuvable', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.kindergartenDirector })
  await page.goto(`/les-lauriers/eleves/${ANGE}`)

  await expect(
    page.getByRole('heading', { name: /Cet élève est introuvable/, level: 1 }),
  ).toBeVisible()
})

test('inscription : classe, élève, parents, vérification, matricule attribué', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/inscriptions')

  await expect(page.getByText('Étape 1 sur 4').first()).toBeVisible()
  await page.getByRole('button', { name: 'Suivant' }).click()
  await expect(page.getByText('Choisissez une classe.')).toBeVisible()
  await page.getByLabel('Classe').selectOption({ label: 'CE2 A — 32 place(s) libre(s)' })
  await page.getByRole('button', { name: 'Suivant' }).click()

  await page.getByLabel('Nom', { exact: true }).fill('Yao')
  await page.getByLabel('Prénom(s)').fill('Emmanuella')
  await page.getByLabel('Date de naissance').fill('2018-05-02')
  await page.getByLabel('Allergies').fill('Pénicilline')
  await page.getByRole('button', { name: 'Suivant' }).click()

  // Le téléphone d'un parent déjà connu de l'école : fratrie reconnue
  await page.getByLabel('Nom complet').fill('Kouadio Parent')
  await page.getByLabel('Téléphone').fill('07 00 00 00 0')
  await page.getByRole('button', { name: 'Suivant' }).click()
  await expect(page.getByText('Saisissez un numéro ivoirien à 10 chiffres.')).toBeVisible()
  await page.getByLabel('Téléphone').fill('07 00 00 00 08')
  await page.getByRole('button', { name: 'Suivant' }).click()

  await expect(page.getByText('YAO Emmanuella').or(page.getByText('Yao Emmanuella'))).toBeVisible()
  await page.getByRole('button', { name: 'Valider l’inscription' }).click()
  await expect(page.getByText('Matricule LAU-000036, classe CE2 A.')).toBeVisible()

  await page.getByRole('link', { name: 'Ouvrir la fiche' }).click()
  await expect(page.getByRole('heading', { name: 'YAO Emmanuella', level: 1 })).toBeVisible()
  await expect(page.getByText('Pénicilline')).toBeVisible()
  await expect(page.getByRole('link', { name: /KOUADIO Ange/ })).toBeVisible()
})

test('scolarité : changer de classe puis noter un départ', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto(`/les-lauriers/eleves/${lauriersStudentId(20)}`)
  await page.getByRole('tab', { name: 'Scolarité' }).click()

  await page.getByRole('button', { name: 'Changer de classe' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Classe').selectOption({ label: 'CE1 B' })
  await dialog.getByRole('button', { name: 'Changer de classe' }).click()
  await expect(page.getByText(/a changé de classe/).first()).toBeVisible()

  await page.getByRole('button', { name: 'Noter un départ' }).click()
  await page.getByRole('dialog').getByLabel('Motif').fill('Déménagement à Bouaké')
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer le départ' }).click()
  await expect(page.getByText('Déménagement à Bouaké')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Noter un retour' })).toBeVisible()
})

test('parents : ajouter un parent et lui confier le paiement', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto(`/les-lauriers/eleves/${lauriersStudentId(5)}`)
  await page.getByRole('tab', { name: 'Parents' }).click()

  await page.getByRole('button', { name: 'Ajouter un parent' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Nom complet').fill('Seydou Bamba')
  await sheet.getByLabel('Lien avec l’élève').selectOption({ label: 'Père' })
  await sheet.getByLabel('Téléphone').fill('05 44 55 66 77')
  await sheet.getByLabel('C’est ce parent qui paie la scolarité').check()
  await sheet.getByRole('button', { name: 'Enregistrer' }).click()

  await expect(page.getByText('Seydou Bamba ajouté(e) au dossier').first()).toBeVisible()
  const card = page.getByRole('listitem').filter({ hasText: 'Seydou Bamba' })
  await expect(card.getByText('Payeur', { exact: true })).toBeVisible()
  await expect(card.getByText('+225 05 44 55 66 77')).toBeVisible()
})
