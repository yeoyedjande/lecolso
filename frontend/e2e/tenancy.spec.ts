import { expect, test, type Page } from '@playwright/test'

import { ACCOUNTS, DEMO_PASSWORD, mockApi, SCHOOLS } from './mock-api.ts'
import { DEMO_NOW } from './screens.ts'

/**
 * Routage par chemin (ADR 0005) : l'école vient de l'URL (/{slug}/…), son UUID part dans X-School-Id
 * seulement si le compte y a une affectation. Le slug n'autorise rien.
 */
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(DEMO_NOW)
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

async function login(page: Page, identifier: string): Promise<void> {
  await page.getByLabel('Téléphone ou e-mail').fill(identifier)
  await page.getByLabel('Mot de passe', { exact: true }).fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Se connecter' }).click()
}

test('école sans affectation : introuvable, aucune requête avec son identifiant', async ({
  page,
}) => {
  const api = await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/petits-genies/eleves')

  await expect(page.getByRole('heading', { name: 'Page introuvable', level: 1 })).toBeVisible()
  expect(api.schoolHeaders).not.toContain(SCHOOLS.genies.id)

  // Sa propre école fonctionne toujours, avec son seul identifiant
  await page.goto('/les-lauriers/eleves')
  await expect(page.getByRole('heading', { name: 'Élèves', level: 1 })).toBeVisible()
  // La liste arrivée, ses requêtes sont parties (le titre s'affiche avant elles)
  await expect(page.getByText(/élèves affichés/)).toBeVisible()
  expect(new Set(api.schoolHeaders)).toEqual(new Set([SCHOOLS.lauriers.id]))
})

test('slug inexistant : même réponse qu’une école sans affectation', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/ecole-imaginaire/tableau-de-bord')

  await expect(page.getByRole('heading', { name: 'Page introuvable', level: 1 })).toBeVisible()
})

test('lien profond vers une école : conservé après la connexion', async ({ page }) => {
  await mockApi(page)
  await page.goto('/les-lauriers/encaissements')
  await expect(page).toHaveURL(/\/connexion\?redirect=/)

  await login(page, ACCOUNTS.director.phone)

  await expect(page).toHaveURL(/\/les-lauriers\/encaissements$/)
})

test('parent de deux écoles : passe de l’une à l’autre par l’adresse, l’en-tête suit', async ({
  page,
}) => {
  const api = await mockApi(page, { session: ACCOUNTS.guardian })
  await page.goto('/les-lauriers/parent')
  await expect(page.getByRole('heading', { name: 'Bonjour, Kouadio', level: 1 })).toBeVisible()
  // Requêtes de la première page encore en cours (annonces, calendrier, non-lus) : comptées avant la navigation,
  // sinon elles arrivent après le relevé et passent pour des requêtes de la seconde page
  await page.waitForLoadState('networkidle')

  const before = api.schoolHeaders.length
  await page.goto('/petits-genies/parent')
  await expect(page.getByRole('heading', { name: 'Bonjour, Kouadio', level: 1 })).toBeVisible()
  await expect(page.getByText('Petits Génies').first()).toBeVisible()
  // Aucune requête de cet écran ne porte l'identifiant de l'école précédente
  expect(api.schoolHeaders.slice(before)).not.toContain(SCHOOLS.lauriers.id)
})

test('deux onglets sur deux écoles : chacun garde la sienne', async ({ context }) => {
  test.skip(test.info().project.name !== 'desktop-1280', 'menu latéral : bureau seulement')
  const lauriers = await context.newPage()
  const genies = await context.newPage()
  for (const page of [lauriers, genies]) {
    await page.clock.setFixedTime(DEMO_NOW)
  }
  const apiLauriers = await mockApi(lauriers, { session: ACCOUNTS.promoter })
  const apiGenies = await mockApi(genies, { session: ACCOUNTS.promoter })

  await lauriers.goto('/les-lauriers/tableau-de-bord')
  await expect(lauriers.getByRole('heading', { name: 'Tableau de bord', level: 1 })).toBeVisible()
  await genies.goto('/petits-genies/tableau-de-bord')
  await expect(genies.getByRole('heading', { name: 'Tableau de bord', level: 1 })).toBeVisible()

  // Navigation dans le premier onglet après le choix fait dans le second
  const before = apiLauriers.schoolHeaders.length
  await lauriers
    .getByRole('navigation', { name: 'Menu' })
    .getByRole('link', { name: 'Élèves' })
    .click()
  await expect(lauriers.getByRole('heading', { name: 'Élèves', level: 1 })).toBeVisible()
  expect(apiLauriers.schoolHeaders.slice(before)).not.toContain(SCHOOLS.genies.id)
  expect(apiGenies.schoolHeaders).not.toContain(SCHOOLS.lauriers.id)
})

test('/compte : profil dans l’espace de l’école courante', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.teacher })
  await page.goto('/les-lauriers/enseignant')
  await expect(page).toHaveURL(/\/les-lauriers\/enseignant$/)

  await page.goto('/compte')
  await expect(page).toHaveURL(/\/les-lauriers\/enseignant\/profil$/)
})

test('page publique : sans session, même pour une école dont on n’est pas membre', async ({
  page,
}) => {
  const api = await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/petits-genies')

  await expect(page.getByRole('heading', { name: /Petits Génies/, level: 1 })).toBeVisible()
  expect(api.schoolHeaders).not.toContain(SCHOOLS.genies.id)
})
