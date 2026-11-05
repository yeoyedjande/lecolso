import { expect, test, type Page } from '@playwright/test'

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

function card(page: Page, name: string) {
  return page.getByRole('main').getByRole('listitem').filter({ hasText: name })
}

test('direction : ajouter un compte, le mot de passe provisoire est montré une fois', async ({
  page,
}) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/utilisateurs')
  await expect(card(page, 'Moussa Comptable')).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter un utilisateur' }).click()
  const sheet = page.getByRole('dialog', { name: 'Ajouter un utilisateur' })
  // Validation locale avant tout envoi
  await sheet.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await expect(sheet.getByText('Le nom doit compter au moins 2 caractères.')).toBeVisible()
  await expect(sheet.getByText('Choisissez un rôle.')).toBeVisible()

  await sheet.getByLabel('Nom complet').fill('Koffi Enseignant')
  await sheet.getByLabel('Téléphone').fill('07 11 22 33 44')
  await sheet.getByLabel('Rôle', { exact: true }).selectOption({ label: 'Enseignant' })
  // La direction ne peut pas attribuer les rôles Promoteur et Direction
  await expect(
    sheet.getByLabel('Rôle', { exact: true }).locator('option', { hasText: 'Direction' }),
  ).toHaveCount(0)
  await sheet.getByRole('button', { name: 'Ajouter', exact: true }).click()

  const created = page.getByRole('dialog', { name: 'Compte créé' })
  await expect(created.getByText('k7Pm2xQa9R')).toBeVisible()
  await created.getByRole('button', { name: 'Fermer' }).last().click()
  await expect(created).toBeHidden()
  await expect(card(page, 'Koffi Enseignant')).toContainText('Enseignant · tout l’établissement')
})

test('direction : rôles, désactivation et réactivation d’un compte', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/utilisateurs')

  await card(page, 'Fatou Enseignante')
    .getByRole('button', { name: 'Gérer : Fatou Enseignante' })
    .click()
  const sheet = page.getByRole('dialog', { name: 'Fatou Enseignante' })

  await sheet.getByLabel('Rôle', { exact: true }).selectOption({ label: 'Secrétariat' })
  await sheet.getByRole('button', { name: 'Attribuer' }).click()
  await expect(page.getByText('Rôle attribué').first()).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Retirer le rôle Secrétariat' })).toBeVisible()

  await sheet.getByRole('button', { name: 'Retirer le rôle Secrétariat' }).click()
  await expect(sheet.getByRole('button', { name: 'Retirer le rôle Secrétariat' })).toHaveCount(0)
  // Dernier rôle : on supprime ou on désactive plutôt le compte
  await sheet.getByRole('button', { name: 'Retirer le rôle Enseignant' }).click()
  await expect(
    page.getByText('C’est son dernier rôle : supprimez ou désactivez plutôt le compte.').first(),
  ).toBeVisible()

  await sheet.getByRole('button', { name: 'Désactiver le compte' }).click()
  await expect(sheet.getByText('Désactivé', { exact: true })).toBeVisible()
  await sheet.getByRole('button', { name: 'Réactiver le compte' }).click()
  await expect(sheet.getByText('Actif', { exact: true })).toBeVisible()

  await sheet.getByRole('button', { name: 'Nouveau mot de passe provisoire' }).click()
  await expect(sheet.getByText('Zq4mT8wPa2')).toBeVisible()
})

test('direction : le compte du promoteur est en lecture seule ; supprimer un compte', async ({
  page,
}) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/utilisateurs')

  await card(page, 'Konan Promoteur')
    .getByRole('button', { name: 'Voir : Konan Promoteur' })
    .click()
  const promoter = page.getByRole('dialog', { name: 'Konan Promoteur' })
  await expect(promoter.getByText(/Vous pouvez consulter ce compte, pas le modifier/)).toBeVisible()
  await expect(promoter.getByRole('button', { name: 'Désactiver le compte' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(promoter).toBeHidden()

  await card(page, 'Moussa Comptable')
    .getByRole('button', { name: 'Gérer : Moussa Comptable' })
    .click()
  const sheet = page.getByRole('dialog', { name: 'Moussa Comptable' })
  await sheet.getByRole('button', { name: 'Supprimer de l’établissement' }).click()
  const confirm = page.getByRole('dialog', {
    name: 'Supprimer Moussa Comptable de l’établissement ?',
  })
  await confirm.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await expect(page.getByText('Compte de Moussa Comptable supprimé').first()).toBeVisible()
  await expect(card(page, 'Moussa Comptable')).toHaveCount(0)
})

test('le menu et l’écran des utilisateurs sont réservés', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.accountant })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/les-lauriers/tableau-de-bord')
  await expect(page.getByRole('navigation', { name: 'Menu' })).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'Utilisateurs' }),
  ).toHaveCount(0)

  await page.goto('/les-lauriers/utilisateurs')
  await expect(page.getByRole('heading', { name: 'Accès réservé', level: 1 })).toBeVisible()
})
