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

test.describe('parcours parent', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page, { session: ACCOUNTS.guardian })
  })

  test('voir les notes de son enfant en deux écrans', async ({ page }) => {
    await page.goto('/les-lauriers/parent')
    await expect(page.getByRole('heading', { name: 'Bonjour, Kouadio', level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: /Voir la fiche de/ })).toHaveCount(2)

    await page.getByRole('link', { name: /Voir la fiche de Ange/ }).click()
    await expect(page.getByRole('tab', { name: 'Notes' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Français')).toBeVisible()
    await expect(page.getByText('Évaluation 1')).toBeVisible()
    // Ni moyenne générale ni rang au fil de l'eau : seulement sur le bulletin validé
    await expect(page.getByText('Moyenne générale', { exact: true })).toHaveCount(0)
  })

  test('paiements : situation réelle, Mobile Money bientôt disponible', async ({ page }) => {
    await page.goto('/les-lauriers/parent/paiements')
    await expect(page.getByRole('heading', { name: 'Paiements', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Payer par Mobile Money' })).toBeDisabled()
    await expect(page.getByText(/sera bientôt disponible/)).toBeVisible()

    await page.getByRole('link', { name: 'Voir les frais de Ange' }).click()
    await expect(page.getByRole('tab', { name: 'Frais' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Échéancier')).toBeVisible()
  })

  test('justifier une absence depuis l’accueil : envoyée à l’école', async ({ page }) => {
    await page.goto('/les-lauriers/parent')
    await expect(page.getByText('1 à justifier').first()).toBeVisible()
    await page.getByRole('link', { name: 'Justifier une absence' }).click()

    await expect(page.getByRole('radio')).toHaveCount(1)
    await page.getByLabel('Motif').fill('Fièvre, rendez-vous chez le médecin')
    await page.getByRole('button', { name: 'Envoyer la justification' }).click()

    await expect(page.getByText('Justification envoyée à l’école').first()).toBeVisible()
    await expect(page).toHaveURL(/\/les-lauriers\/parent\/enfants\/.*onglet=absences/)
    await expect(page.getByText('Justification envoyée, en attente')).toBeVisible()
  })

  test('la fiche d’un enfant d’une autre famille est introuvable', async ({ page }) => {
    await page.goto('/les-lauriers/parent/enfants/0195f000-0000-7000-8000-100000000001')
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
  await expect(page.getByText('Enregistré', { exact: true })).toBeVisible()
})

test('enseignante : élèves de la classe, fiche et appel d’un parent', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.teacher })
  await page.goto('/les-lauriers/enseignant')
  await page.getByRole('main').getByRole('link', { name: 'Élèves' }).first().click()
  await expect(page.getByRole('heading', { name: 'Mes élèves', level: 1 })).toBeVisible()
  await page.getByRole('main').getByRole('listitem').getByRole('link').first().click()
  await expect(page.getByText('Parents', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Appeler / }).first()).toHaveAttribute(
    'href',
    /^tel:\+225/,
  )
})

test('enseignante : appréciation d’un élève depuis le téléphone', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.teacher })
  await page.goto('/les-lauriers/enseignant')
  await page.getByRole('main').getByRole('link', { name: 'Appréciations' }).first().click()
  await page
    .getByRole('button', { name: /^Écrire l’appréciation de / })
    .first()
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Appréciation générale de l’enseignant(e)').fill('Élève attentive.')
  await expect(dialog.getByLabel('Observation de la direction')).toBeDisabled()
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Rédigée').first()).toBeVisible()
})

test('enseignante : appel hors connexion, envoyé au retour du réseau', async ({
  page,
  context,
}) => {
  await mockApi(page, { session: ACCOUNTS.teacher })
  await page.goto('/les-lauriers/enseignant/appel')
  await expect(page.getByRole('button', { name: 'Enregistrer l’appel' })).toBeVisible()
  await context.setOffline(true)
  await page
    .getByRole('button', { name: /^Absent — / })
    .first()
    .click()
  await page.getByRole('button', { name: 'Enregistrer l’appel' }).click()
  await expect(page.getByText(/1 élément\(s\) en attente d’envoi/)).toBeVisible()
  await context.setOffline(false)
  await expect(page.getByText(/en attente d’envoi/)).toHaveCount(0)
})
