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

  test('payer par Mobile Money : validation sur le téléphone, puis reçu', async ({ page }) => {
    await page.goto('/les-lauriers/parent/paiements')
    await expect(page.getByRole('heading', { name: 'Paiements', level: 1 })).toBeVisible()
    await page.getByRole('button', { name: 'Payer pour Ange' }).click()

    const dialog = page.getByRole('dialog', { name: 'Payer par Mobile Money' })
    await dialog.getByLabel('Autre montant').check()
    await dialog.getByLabel('Montant (FCFA)').fill('15000')
    await dialog.getByLabel('Wave').check()
    await expect(dialog.getByLabel('Numéro Mobile Money')).not.toHaveValue('')
    await dialog.getByRole('button', { name: /^Payer 15/ }).click()

    await expect(dialog.getByText('Validez le paiement sur votre téléphone…')).toBeVisible()
    await expect(dialog.getByText('Paiement réussi')).toBeVisible({ timeout: 10_000 })
    await dialog.getByRole('link', { name: 'Voir le reçu' }).click()
    await expect(page.getByText(/quinze mille francs CFA/)).toBeVisible()
    await expect(page.getByText('Wave')).toBeVisible()
  })

  test('paiement Mobile Money refusé : motif et nouvel essai', async ({ page }) => {
    await page.goto('/les-lauriers/parent/paiements')
    await page.getByRole('button', { name: 'Payer pour Ange' }).click()
    const dialog = page.getByRole('dialog', { name: 'Payer par Mobile Money' })
    await dialog.getByLabel('Numéro Mobile Money').fill('1234')
    await expect(dialog.getByText('Saisissez un numéro ivoirien à 10 chiffres.')).toBeVisible()
    await dialog.getByLabel('Numéro Mobile Money').fill('0701020399')
    await dialog.getByRole('button', { name: /^Payer/ }).click()
    await expect(dialog.getByText('Paiement non abouti')).toBeVisible({ timeout: 10_000 })
    await expect(dialog.getByText('Solde insuffisant.')).toBeVisible()
    await dialog.getByRole('button', { name: 'Réessayer' }).click()
    await expect(dialog.getByRole('button', { name: /^Payer/ })).toBeVisible()
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

  test('écrire à l’administration et lire la réponse de la titulaire', async ({ page }) => {
    await page.goto('/les-lauriers/parent/messages')
    await page.getByRole('button', { name: /Devoirs de la semaine/ }).click()
    await expect(page.getByText('ce sont les exercices 3 et 4 page 27.')).toBeVisible()
    await page.getByRole('button', { name: 'Retour aux conversations' }).click()

    await page.getByRole('button', { name: 'Écrire à l’école' }).click()
    await page.getByLabel('Enfant').selectOption({ label: 'KOUADIO Ange' })
    await page.getByLabel('L’administration (direction, secrétariat)').check()
    await page.getByLabel('Objet').fill('Certificat de scolarité')
    await page
      .getByLabel('Message', { exact: true })
      .fill('Bonjour, il me faut un certificat pour Ange.')
    await page.getByRole('button', { name: 'Envoyer', exact: true }).click()

    await expect(page.getByText('Message envoyé').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Certificat de scolarité' })).toBeVisible()
    await expect(
      page
        .getByRole('list', { name: 'Messages de la conversation' })
        .getByText('Bonjour, il me faut un certificat pour Ange.'),
    ).toBeVisible()
  })

  test('prévenir d’une absence à venir : l’école la voit et l’accepte', async ({ page }) => {
    const mock = await mockApi(page, { session: ACCOUNTS.guardian })
    await page.goto('/les-lauriers/parent/justifier')
    await page.getByRole('link', { name: 'Absence à venir ? Prévenez l’école' }).click()
    await expect(
      page.getByRole('heading', { name: 'Prévenir d’une absence', level: 1 }),
    ).toBeVisible()
    await page.getByLabel('Du', { exact: true }).fill('2026-11-05')
    await page.getByLabel('Au', { exact: true }).fill('2026-11-06')
    await page.getByLabel('Motif').fill('Mariage au village')
    await page.getByRole('button', { name: 'Prévenir l’école' }).click()

    await expect(page.getByText('L’école est prévenue').first()).toBeVisible()
    await expect(page).toHaveURL(/onglet=absences/)
    await expect(page.getByText('En attente de l’école')).toBeVisible()

    mock.switchSession(ACCOUNTS.director)
    await page.goto('/les-lauriers/presences')
    await page.getByRole('tab', { name: 'Absents du jour' }).click()
    const planned = page.getByRole('region', { name: 'Absences annoncées par les parents' })
    await expect(planned.getByText('Mariage au village')).toBeVisible()
    await planned.getByRole('button', { name: 'Accepter' }).click()
    await expect(planned.getByText('Absence excusée')).toBeVisible()
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

test('enseignante : réponse à un parent dans le fil de sa classe', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.teacher })
  await page.goto('/les-lauriers/enseignant/messages')
  await page.getByRole('button', { name: /Devoirs de la semaine/ }).click()
  await page.getByLabel('Votre réponse').fill('N’oubliez pas la règle demain.')
  await page
    .locator('form')
    .filter({ has: page.getByLabel('Votre réponse') })
    .getByRole('button', { name: 'Envoyer' })
    .click()
  await expect(
    page
      .getByRole('list', { name: 'Messages de la conversation' })
      .getByText('N’oubliez pas la règle demain.'),
  ).toBeVisible()
  // Le fil de l'administration (Junior) n'est pas le sien
  await page.getByRole('button', { name: 'Retour aux conversations' }).click()
  await expect(page.getByRole('button', { name: /Retard du matin/ })).toHaveCount(0)
})

test('enseignante : annonce à sa classe depuis les messages', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.teacher })
  await page.goto('/les-lauriers/enseignant/messages')
  await page.getByRole('button', { name: 'Annonce à la classe' }).click()
  await page.getByLabel('Titre').fill('Sortie au musée')
  await page.getByLabel('Message', { exact: true }).first().fill('Jeudi : prévoir un goûter.')
  await expect(page.getByLabel('Destinataires')).toContainText('Classe CE1 A')
  await page.getByRole('button', { name: 'Publier l’annonce' }).click()
  await expect(page.getByText(/Annonce publiée pour \d+ élève/).first()).toBeVisible()

  await page.goto('/les-lauriers/enseignant')
  await expect(page.getByRole('heading', { name: 'Sortie au musée' })).toBeVisible()
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
