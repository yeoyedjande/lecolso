import { expect, test } from '@playwright/test'

import { ACCOUNTS, DEMO_PASSWORD, mockApi } from './mock-api.ts'
import { DEMO_NOW } from './screens.ts'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(DEMO_NOW)
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

test.describe('super-admin', () => {
  test('connexion : arrive sur la plateforme et crée une école', async ({ page }) => {
    await mockApi(page)
    await page.goto('/connexion')
    await page.getByLabel('Téléphone ou e-mail').fill(ACCOUNTS.superAdmin.email)
    await page.getByLabel('Mot de passe', { exact: true }).fill(DEMO_PASSWORD)
    await page.getByRole('button', { name: 'Se connecter' }).click()

    await expect(page).toHaveURL(/\/plateforme$/)
    await expect(page.getByText('2 école(s)')).toBeVisible()

    await page.getByRole('link', { name: 'Créer une école' }).click()
    await page.getByLabel('Nom de l’établissement').fill('École Les Flamboyants')
    await expect(page.getByLabel('Adresse de la page de l’école')).toHaveValue(
      'ecole-les-flamboyants',
    )
    await page.getByLabel('Ville').fill('Bouaké')
    await page.getByLabel('Nom complet').fill('Adjoua Koffi')
    await page.getByLabel('Téléphone').fill('07 11 22 33 44')
    await page.getByRole('button', { name: 'Créer l’école' }).click()

    await expect(
      page.getByRole('heading', { name: 'École Les Flamboyants est créée', level: 1 }),
    ).toBeVisible()
    await expect(page.getByText('k7Pm2xQa9R')).toBeVisible()
    await page.getByRole('link', { name: 'Voir les écoles' }).click()
    await expect(page.getByText('3 école(s)')).toBeVisible()
  })

  test('adresse déjà prise : message de l’API sur le champ', async ({ page }) => {
    await mockApi(page, { session: ACCOUNTS.superAdmin })
    await page.goto('/plateforme/nouvelle')
    await page.getByLabel('Nom de l’établissement').fill('Les Lauriers')
    await page.getByLabel('Nom complet').fill('Adjoua Koffi')
    await page.getByLabel('Téléphone').fill('0711223344')
    await page.getByRole('button', { name: 'Créer l’école' }).click()

    await expect(
      page.getByText('Cette adresse est déjà utilisée par une autre école.'),
    ).toBeVisible()
    await expect(page.getByLabel('Adresse de la page de l’école')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  test('un directeur ne peut pas ouvrir la plateforme', async ({ page }) => {
    await mockApi(page, { session: ACCOUNTS.director })
    await page.goto('/plateforme')
    await expect(page).toHaveURL(/\/les-lauriers\/tableau-de-bord$/)
  })
})

test.describe('page publique de l’école (sans connexion)', () => {
  test('présentation puis pré-inscription', async ({ page }) => {
    const api = await mockApi(page)
    await page.goto('/les-lauriers')
    await expect(
      page.getByRole('heading', { name: 'Bienvenue à Les Lauriers', level: 1 }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Primaire', level: 3 })).toBeVisible()
    // Aucune requête authentifiée : pas d'appel à /me depuis la page publique
    expect(api.calls.get('GET /me')).toBeUndefined()

    await page.getByRole('link', { name: 'Pré-inscrire mon enfant' }).first().click()
    await page.getByLabel('Nom', { exact: true }).fill('Kouassi')
    await page.getByLabel('Prénom(s)').fill('Aya')
    await page.getByLabel('Date de naissance').fill('2020-03-14')
    await expect(page.getByRole('heading', { name: /Tarifs/ })).toHaveCount(0)
    await page.getByLabel('Sexe').selectOption('Fille')
    await page.getByLabel('Niveau souhaité').selectOption('Moyenne section')
    await page.getByLabel('Nom complet').fill('Adjoua Kouassi')
    await page.getByLabel('Téléphone').fill('1234')
    await page.getByRole('button', { name: 'Envoyer la demande' }).click()
    await expect(page.getByText('Saisissez un numéro ivoirien à 10 chiffres.')).toBeVisible()
    await expect(page.getByText('Votre accord est nécessaire pour être recontacté.')).toBeVisible()

    await page.getByLabel('Téléphone').fill('07 00 00 00 21')
    await page.getByLabel('J’accepte que l’école me contacte au sujet de cette demande.').check()
    await page.getByRole('button', { name: 'Envoyer la demande' }).click()
    await expect(page.getByRole('heading', { name: /Demande envoyée/, level: 1 })).toBeVisible()
    await expect(page.getByText(/Numéro de dossier PRE-2026-000002/)).toBeVisible()
    // Staging (envoi factice) : la décision est annoncée par SMS
    await expect(page.getByText(/vous informera de sa décision par SMS/)).toBeVisible()
  })

  test('tarifs publiés par l’école : grille de l’année en cours', async ({ page }) => {
    await mockApi(page, { session: ACCOUNTS.director })
    await page.goto('/les-lauriers/parametres')
    await page.getByLabel('Afficher les tarifs sur la page publique').click()
    await expect(
      page.getByText('Les tarifs sont affichés sur la page publique', { exact: true }),
    ).toBeVisible()

    await page.goto('/les-lauriers')
    await expect(page.getByRole('heading', { name: 'Tarifs 2026-2027', level: 2 })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Scolarité' })).toBeVisible()
    await expect(page.getByRole('rowheader', { name: /CE1/ })).toBeVisible()
  })

  test('pré-inscription sans fournisseur SMS : aucune promesse de SMS', async ({ page }) => {
    await mockApi(page, { sms: false })
    await page.goto('/les-lauriers/preinscription')
    await page.getByLabel('Nom', { exact: true }).fill('Kouassi')
    await page.getByLabel('Prénom(s)').fill('Aya')
    await page.getByLabel('Date de naissance').fill('2020-03-14')
    await page.getByLabel('Niveau souhaité').selectOption('Moyenne section')
    await page.getByLabel('Nom complet').fill('Adjoua Kouassi')
    await page.getByLabel('Téléphone').fill('07 00 00 00 21')
    await page.getByLabel('J’accepte que l’école me contacte au sujet de cette demande.').check()
    await page.getByRole('button', { name: 'Envoyer la demande' }).click()
    await expect(
      page.getByText(/l’établissement vous recontactera au \+225 07 00 00 00 21\.$/),
    ).toBeVisible()
    await expect(page.getByText(/SMS/)).toHaveCount(0)
  })

  test('école inconnue : message clair', async ({ page }) => {
    await mockApi(page)
    await page.goto('/inconnue')
    await expect(
      page.getByRole('heading', { name: 'Cette école n’existe pas ou n’a pas encore de page.' }),
    ).toBeVisible()
  })
})
