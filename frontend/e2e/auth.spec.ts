import { expect, test, type Page } from '@playwright/test'

import { ACCOUNTS, DEMO_PASSWORD, mockApi } from './mock-api.ts'

async function login(page: Page, identifier: string, password = DEMO_PASSWORD) {
  await page.getByLabel('Téléphone ou e-mail').fill(identifier)
  await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
}

test('sans session, un écran protégé mène à la connexion puis y revient', async ({ page }) => {
  await mockApi(page)
  await page.goto('/les-lauriers/eleves')

  await expect(page).toHaveURL(/\/connexion\?redirect=/)
  await expect(page.getByRole('heading', { name: 'Bon retour parmi nous', level: 1 })).toBeVisible()

  await login(page, '07 00 00 00 03')

  await expect(page).toHaveURL(/\/les-lauriers\/eleves$/)
  await expect(page.getByRole('heading', { name: 'Élèves', level: 1 })).toBeVisible()
})

test('plusieurs établissements : le lien profond désigne l’école, aucun choix à faire', async ({
  page,
}) => {
  await mockApi(page)
  await page.goto('/petits-genies/eleves')
  await expect(page).toHaveURL(/\/connexion\?redirect=/)

  await login(page, ACCOUNTS.promoter.phone)

  await expect(page).toHaveURL(/\/petits-genies\/eleves$/)
  await expect(page.getByRole('heading', { name: 'Élèves', level: 1 })).toBeVisible()
})

test('accueil sans session : connexion, pas d’écran d’erreur (régression staging)', async ({
  page,
}) => {
  await mockApi(page)
  await page.goto('/')

  await expect(page).toHaveURL(/\/connexion/)
  await expect(page.getByRole('heading', { name: 'Bon retour parmi nous', level: 1 })).toBeVisible()
  await expect(page.getByText('Un problème est survenu')).toHaveCount(0)
})

test('session expirée pendant la navigation : connexion, puis retour à l’écran demandé', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-11-04T09:30:00Z') })
  const api = await mockApi(page, { session: ACCOUNTS.director })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/les-lauriers/eleves')
  await expect(page.getByRole('heading', { name: 'Élèves', level: 1 })).toBeVisible()

  // Le profil reste en cache côté navigateur ; le serveur, lui, a fermé la session. 70 secondes plus tard
  // (profil revérifié après 60 s, avant la relecture des messages non lus à 90 s), l'écran suivant revérifie
  // le profil (/me → 401) alors que l'ancien profil est encore en cache.
  await page.waitForLoadState('networkidle') // premières lectures de l'écran (dont les non-lus) terminées
  api.expireSession()
  await page.clock.fastForward('01:10')
  await page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'Notes' }).click()

  await expect(page).toHaveURL(/\/connexion\?redirect=/)
  await expect(page.getByRole('heading', { name: 'Bon retour parmi nous', level: 1 })).toBeVisible()
  // Le profil expiré ne renvoie pas vers l'espace : on reste sur la connexion
  await page.clock.fastForward('00:01')
  await expect(page).toHaveURL(/\/connexion/)
  await expect(page.getByRole('heading', { name: 'Bon retour parmi nous', level: 1 })).toBeVisible()
})

test('identifiants refusés : message sur le champ, sans dire lequel est faux', async ({ page }) => {
  await mockApi(page)
  await page.goto('/connexion')

  await login(page, '07 00 00 00 03', 'mauvais-mot-de-passe')

  await expect(
    page.getByRole('alert').filter({ hasText: 'Identifiant ou mot de passe incorrect.' }),
  ).toBeVisible()
  await expect(page.getByLabel('Téléphone ou e-mail')).toHaveAttribute('aria-invalid', 'true')
})

test('trop de tentatives (429) : message d’attente', async ({ page }) => {
  await mockApi(page, { throttleAfter: 0 })
  await page.goto('/connexion')

  await login(page, '07 00 00 00 03')

  await expect(
    page.getByText('Trop de tentatives. Patientez une minute avant de réessayer.'),
  ).toBeVisible()
})

test('champs vides : erreurs locales, aucun appel à l’API', async ({ page }) => {
  const api = await mockApi(page)
  await page.goto('/connexion')

  await page.getByRole('button', { name: 'Se connecter' }).click()

  await expect(page.getByText('Saisissez votre téléphone ou votre e-mail.')).toBeVisible()
  await expect(page.getByText('Saisissez votre mot de passe.')).toBeVisible()
  expect(api.calls.get('POST /auth/login')).toBeUndefined()
})

test('mot de passe provisoire : changement obligatoire avant tout écran', async ({ page }) => {
  await mockApi(page)
  await page.goto('/connexion')
  await login(page, ACCOUNTS.provisional.email)

  await expect(page).toHaveURL(/\/mot-de-passe$/)
  await expect(page.getByText(/mot de passe provisoire/).first()).toBeVisible()

  // Tout autre écran ramène au changement de mot de passe
  await page.goto('/les-lauriers/tableau-de-bord')
  await expect(page).toHaveURL(/\/mot-de-passe$/)

  await page.getByLabel('Mot de passe actuel').fill(DEMO_PASSWORD)
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('court')
  await page.getByLabel('Confirmez le nouveau mot de passe').fill('autre')
  await page.getByRole('button', { name: 'Enregistrer le mot de passe' }).click()
  await expect(page.getByText('Le mot de passe doit contenir au moins 8 caractères.')).toBeVisible()
  await expect(page.getByText('Les deux mots de passe ne correspondent pas.')).toBeVisible()

  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('Abidjan-Cocody-2026')
  await page.getByLabel('Confirmez le nouveau mot de passe').fill('Abidjan-Cocody-2026')
  await expect(page.getByText('Robustesse : excellente')).toBeVisible()
  await page.getByRole('button', { name: 'Enregistrer le mot de passe' }).click()

  await expect(page).toHaveURL(/\/les-lauriers\/tableau-de-bord$/)
  await expect(page.getByText('Mot de passe enregistré', { exact: true })).toBeVisible()
})

test('mot de passe actuel refusé par l’API : erreur sur le champ', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.provisional })
  await page.goto('/mot-de-passe')

  await page.getByLabel('Mot de passe actuel').fill('pas-le-bon')
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('Abidjan-Cocody-2026')
  await page.getByLabel('Confirmez le nouveau mot de passe').fill('Abidjan-Cocody-2026')
  await page.getByRole('button', { name: 'Enregistrer le mot de passe' }).click()

  await expect(page.getByText('Le mot de passe est incorrect.')).toBeVisible()
  await expect(page).toHaveURL(/\/mot-de-passe$/)
})

test('plusieurs établissements : choix puis espace de gestion', async ({ page }) => {
  await mockApi(page)
  await page.goto('/connexion')
  await login(page, ACCOUNTS.promoter.phone)

  await expect(page).toHaveURL(/\/etablissements$/)
  await page.getByRole('button', { name: /Petits Génies/ }).click()

  await expect(page).toHaveURL(/\/petits-genies\/tableau-de-bord$/)
  await expect(page.getByRole('heading', { name: 'Tableau de bord', level: 1 })).toBeVisible()
  await expect(page.getByText('Petits Génies').first()).toBeVisible()
})

test('enseignant : espace enseignant, le back-office lui est fermé', async ({ page }) => {
  await mockApi(page)
  await page.goto('/connexion')
  await login(page, ACCOUNTS.teacher.email)

  await expect(page).toHaveURL(/\/les-lauriers\/enseignant$/)
  await expect(
    page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'Appel' }),
  ).toBeVisible()

  await page.goto('/les-lauriers/tableau-de-bord')
  await expect(page).toHaveURL(/\/les-lauriers\/enseignant$/)
})

test('parent de deux écoles : choix de l’école puis espace parent', async ({ page }) => {
  await mockApi(page)
  await page.goto('/connexion')
  await login(page, '0700000008')

  await page.getByRole('button', { name: /Les Lauriers/ }).click()

  await expect(page).toHaveURL(/\/les-lauriers\/parent$/)
  await expect(page.getByRole('heading', { name: 'Bonjour, Kouadio', level: 1 })).toBeVisible()
})

test('menu du back-office limité aux droits : la comptabilité ne voit ni notes ni paramètres', async ({
  page,
}) => {
  await mockApi(page, { session: ACCOUNTS.accountant })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/les-lauriers/tableau-de-bord')

  const menu = page.getByRole('navigation', { name: 'Menu' })
  await expect(menu.getByRole('link', { name: 'Encaissements' })).toBeVisible()
  await expect(menu.getByRole('link', { name: 'Notes' })).toHaveCount(0)
  await expect(menu.getByRole('link', { name: 'Paramètres' })).toHaveCount(0)
})

test('déconnexion : retour à la connexion, écrans protégés refermés', async ({ page }) => {
  const api = await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/tableau-de-bord')

  await page.getByRole('button', { name: /Mon profil/ }).click()
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click()

  await expect(page).toHaveURL(/\/connexion/)
  expect(api.calls.get('POST /auth/logout')).toBe(1)

  await page.goto('/les-lauriers/tableau-de-bord')
  await expect(page).toHaveURL(/\/connexion/)
})

test('page inconnue dans une école : 404 en français, dans la mise en page', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/nulle-part')

  await expect(page.getByRole('heading', { name: 'Page introuvable', level: 1 })).toBeVisible()
})

test('adresse d’un seul segment inconnue : page publique « école introuvable »', async ({
  page,
}) => {
  await mockApi(page)
  await page.goto('/nulle-part')

  await expect(
    page.getByRole('heading', { name: 'Cette école n’existe pas ou n’a pas encore de page.' }),
  ).toBeVisible()
})

test('état du service, public', async ({ page }) => {
  await mockApi(page)
  await page.goto('/etat')

  await expect(page.getByText('API : OK')).toBeVisible()
})
