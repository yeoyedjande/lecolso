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

test('direction : créer, modifier puis supprimer un rôle personnalisé', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/roles')
  await expect(page.getByRole('heading', { name: 'Rôles et permissions', level: 1 })).toBeVisible()

  await page.getByRole('button', { name: 'Nouveau rôle' }).click()
  const editor = page.getByRole('dialog', { name: 'Nouveau rôle' })
  await editor.getByLabel('Nom du rôle').fill('Surveillant général')
  await editor.getByLabel('Description').fill('Présences et retards')
  await editor.getByRole('checkbox', { name: 'Voir les élèves' }).check()
  await editor.getByRole('checkbox', { name: 'Faire l’appel et gérer les présences' }).check()
  // Pas d'élévation : la direction ne détient pas le paiement de l'abonnement
  await expect(editor.getByRole('checkbox', { name: 'Payer l’abonnement EKALEWA' })).toBeDisabled()
  // Les permissions réservées aux parents ne sont jamais proposées
  await expect(editor.getByText('Payer en ligne (parents)')).toHaveCount(0)
  await editor.getByRole('button', { name: 'Enregistrer le rôle' }).click()
  await expect(editor).toBeHidden()

  await expect(page.getByText('Rôle « Surveillant général » créé').first()).toBeVisible()
  const card = page
    .getByRole('main')
    .getByRole('listitem')
    .filter({ hasText: 'Surveillant général' })
  await expect(card).toContainText('Rôle personnalisé')
  await expect(card).toContainText('2 permissions')
  await expect(card).toContainText('Aucun utilisateur')

  await card.getByRole('button', { name: 'Modifier : Surveillant général' }).click()
  const edit = page.getByRole('dialog', { name: 'Modifier « Surveillant général »' })
  await edit.getByLabel('Nom du rôle').fill('Surveillant')
  await edit.getByRole('checkbox', { name: 'Envoyer des messages' }).check()
  await edit.getByRole('button', { name: 'Enregistrer le rôle' }).click()
  await expect(edit).toBeHidden()
  await expect(page.getByText('Rôle « Surveillant » enregistré').first()).toBeVisible()
  const renamed = page.getByRole('main').getByRole('listitem').filter({ hasText: 'Surveillant' })
  await expect(renamed).toContainText('3 permissions')

  await renamed.getByRole('button', { name: 'Supprimer : Surveillant' }).click()
  const confirm = page.getByRole('dialog', { name: 'Supprimer « Surveillant » ?' })
  await confirm.getByRole('button', { name: 'Supprimer le rôle' }).click()
  await expect(page.getByText('Rôle « Surveillant » supprimé').first()).toBeVisible()
  await expect(
    page.getByRole('main').getByRole('listitem').filter({ hasText: 'Surveillant' }),
  ).toHaveCount(0)
})

test('direction : ajuste le secrétariat, consulte sans modifier un rôle verrouillé', async ({
  page,
}) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/roles')

  const director = page
    .getByRole('main')
    .getByRole('listitem')
    .filter({ hasText: 'Pilotage, pédagogie' })
  await expect(director).toContainText('Verrouillé')
  await director.getByRole('button', { name: 'Voir les permissions : Direction' }).click()
  const view = page.getByRole('dialog', { name: 'Permissions : Direction' })
  await expect(view.getByRole('checkbox', { name: 'Valider les bulletins' })).toBeChecked()
  await expect(view.getByRole('checkbox', { name: 'Valider les bulletins' })).toBeDisabled()
  await expect(view.getByRole('button', { name: 'Enregistrer le rôle' })).toHaveCount(0)
  await view.getByRole('button', { name: 'Fermer' }).first().click()
  await expect(view).toBeHidden()

  await page.getByRole('button', { name: 'Modifier : Secrétariat' }).click()
  const secretary = page.getByRole('dialog', { name: 'Modifier « Secrétariat »' })
  // Rôle système : ni nom ni description, seulement les permissions
  await expect(secretary.getByLabel('Nom du rôle')).toHaveCount(0)
  await secretary.getByRole('checkbox', { name: 'Voir les frais, paiements et impayés' }).uncheck()
  await secretary.getByRole('button', { name: 'Enregistrer le rôle' }).click()
  await expect(page.getByText('Rôle « Secrétariat » enregistré').first()).toBeVisible()
})

test('direction : dupliquer le rôle Parent donne un rôle du personnel enregistrable', async ({
  page,
}) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/roles')

  await page.getByRole('button', { name: 'Dupliquer : Parent' }).click()
  const editor = page.getByRole('dialog', { name: 'Nouveau rôle' })
  await expect(editor.getByLabel('Nom du rôle')).toHaveValue('Parent (copie)')
  // Les permissions propres aux parents (payer, justifier) ne sont pas reprises : le rôle reste enregistrable
  await editor.getByRole('button', { name: 'Enregistrer le rôle' }).click()
  await expect(editor).toBeHidden()
  const copy = page.getByRole('main').getByRole('listitem').filter({ hasText: 'Parent (copie)' })
  await expect(copy).toContainText('Rôle personnalisé')
  await expect(copy).toContainText('6 permissions')
})

test('le menu et l’écran des rôles sont réservés à qui gère les rôles', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.accountant })
  // Menu latéral du back-office (replié derrière un bouton à 360 px)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/les-lauriers/tableau-de-bord')
  await expect(page.getByRole('navigation', { name: 'Menu' })).toBeVisible()
  await expect(
    page
      .getByRole('navigation', { name: 'Menu' })
      .getByRole('link', { name: 'Rôles et permissions' }),
  ).toHaveCount(0)

  await page.goto('/les-lauriers/roles')
  await expect(page.getByRole('heading', { name: 'Accès réservé', level: 1 })).toBeVisible()
})
