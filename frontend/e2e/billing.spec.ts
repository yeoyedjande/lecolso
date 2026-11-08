import { expect, test } from '@playwright/test'

import { ACCOUNTS, lauriersStudentId, mockApi } from './mock-api.ts'
import { DEMO_NOW } from './screens.ts'

const LAURIERS = '0195f000-0000-7000-8000-000000000001'
/** Fils aîné du compte parent (CE1 A), avec une remise de fratrie. */
const ANGE = lauriersStudentId(23)

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(DEMO_NOW)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript((school) => {
    window.localStorage.setItem('gestion-ecole.school-id', school)
  }, LAURIERS)
})

test('grille de frais : modifier un montant et le calendrier d’un cycle', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/frais')

  await expect(page.getByRole('heading', { name: /Primaire/, level: 2 })).toBeVisible()
  await page.getByRole('button', { name: 'Modifier le montant Scolarité — CE1' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Montant annuel (FCFA)').fill('12,5')
  await expect(dialog.getByText('Saisissez un montant entier, sans centimes.')).toBeVisible()
  await dialog.getByLabel('Montant annuel (FCFA)').fill('295 000')
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Montant mis à jour').first()).toBeVisible()
  await expect(page.getByRole('cell', { name: /295\s000\sFCFA/ })).toBeVisible()

  const primary = page.getByRole('region', { name: /Primaire/ })
  await primary.getByLabel('Date de l’échéance 2').fill('2027-01-12')
  await primary.getByRole('button', { name: 'Enregistrer le calendrier (Primaire)' }).click()
  await expect(page.getByText('Calendrier de Primaire enregistré').first()).toBeVisible()
})

test('secrétariat : grille et échéancier en lecture seule', async ({ page }) => {
  await mockApi(page, { session: { ...ACCOUNTS.provisional, mustChangePassword: false } })
  await page.goto('/les-lauriers/frais')

  await expect(page.getByText('Calendrier des échéances').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^Modifier le montant/ })).toHaveCount(0)

  await page.goto('/les-lauriers/echeanciers')
  await expect(page.getByText('Total de l’année')).toBeVisible()
  await expect(page.getByRole('cell', { name: '07/09/2026' })).toBeVisible()
})

test('fiche élève : facture avec remise, service, ligne manuelle', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto(`/les-lauriers/eleves/${ANGE}`)
  await page.getByRole('tab', { name: 'Frais' }).click()

  await expect(page.getByText('Frais 2026-2027')).toBeVisible()
  await expect(page.getByText('Fratrie : deux enfants inscrits')).toBeVisible()

  await page.getByLabel('Ajouter un service').selectOption({ label: 'Transport' })
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await expect(page.getByText('Service ajouté à partir d’aujourd’hui').first()).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Transport', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter une ligne' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Libellé').fill('Tenue scolaire')
  await dialog.getByLabel('Montant (FCFA)').fill('12 500')
  await dialog.getByRole('button', { name: 'Ajouter la ligne' }).click()
  await expect(page.getByText('Ligne ajoutée').first()).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Tenue scolaire', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Accorder une remise' }).click()
  await page.getByRole('dialog').getByLabel('Motif').fill('Geste commercial')
  await page.getByRole('dialog').getByLabel('Montant (FCFA)').fill('9 000 000')
  await page.getByRole('dialog').getByRole('button', { name: 'Accorder la remise' }).click()
  await expect(
    page.getByRole('dialog').getByText('La remise dépasse le montant restant de la facture.'),
  ).toBeVisible()
  await page.getByRole('dialog').getByLabel('Montant (FCFA)').fill('5 000')
  await page.getByRole('dialog').getByRole('button', { name: 'Accorder la remise' }).click()
  await expect(page.getByText('Remise accordée').first()).toBeVisible()

  await page.getByRole('button', { name: 'Retirer Tenue scolaire' }).click()
  await expect(page.getByText('Tenue scolaire retiré').first()).toBeVisible()
})

test('comptabilité : modifie la facture mais n’accorde pas de remise', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.accountant })
  await page.goto(`/les-lauriers/eleves/${ANGE}`)
  await page.getByRole('tab', { name: 'Frais' }).click()

  await expect(page.getByRole('button', { name: 'Ajouter une ligne' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Accorder une remise' })).toHaveCount(0)
})

test('inscription avec un service optionnel facturé', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/inscriptions')

  await page.getByLabel('Classe').selectOption({ label: 'CE2 A — 32 place(s) libre(s)' })
  await page.getByText('Cantine').click()
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByLabel('Nom', { exact: true }).fill('Bamba')
  await page.getByLabel('Prénom(s)').fill('Inès')
  await page.getByLabel('Date de naissance').fill('2018-05-02')
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByLabel('Nom complet').fill('Rachel Bamba')
  await page.getByLabel('Téléphone').fill('07 44 55 66 77')
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByRole('button', { name: 'Valider l’inscription' }).click()

  await page.getByRole('link', { name: 'Ouvrir la fiche' }).click()
  await page.getByRole('tab', { name: 'Frais' }).click()
  await expect(page.getByRole('cell', { name: 'Cantine', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Scolarité', exact: true })).toBeVisible()
})

test('impayés : relance SMS d’un parent, une seule fois par semaine', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/impayes')

  await expect(page.getByText('Total en retard')).toBeVisible()
  await page
    .getByRole('checkbox', { name: /^Sélectionner / })
    .first()
    .check()
  await page.getByRole('button', { name: 'Relancer (1)' }).click()
  const dialog = page.getByRole('dialog', { name: /Relancer par SMS/ })
  await expect(dialog).toContainText('présente un retard de')
  await dialog.getByRole('button', { name: 'Envoyer les SMS' }).click()
  await expect(page.getByText('1 SMS de relance mis en envoi').first()).toBeVisible()
  await expect(page.getByText(/Relancé le 04\/11\/2026/).first()).toBeVisible()

  await page
    .getByRole('checkbox', { name: /^Sélectionner / })
    .first()
    .check()
  await page.getByRole('button', { name: 'Relancer (1)' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Envoyer les SMS' }).click()
  // Texte présent dans la notification et dans sa zone d'annonce pour les lecteurs d'écran
  await expect(page.getByText(/déjà relancé\(s\) depuis moins de 7 jours/).first()).toBeVisible()
})

test('impayés sans fournisseur SMS : aucune relance proposée ni annoncée', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director, sms: false })
  await page.goto('/les-lauriers/impayes')

  await expect(page.getByText('Total en retard')).toBeVisible()
  await expect(
    page.getByText(/Les relances par SMS seront disponibles quand le service SMS sera activé/),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /^Relancer/ })).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: /^Sélectionner / })).toHaveCount(0)
})

test('tableau de bord : effectifs et encaissements réels', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.accountant })
  await page.goto('/les-lauriers/tableau-de-bord')

  await expect(page.getByText('Encaissé ce mois')).toBeVisible()
  await expect(page.getByText('Derniers encaissements')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Voir le reçu REC-2026-000001' })).toBeVisible()
})
