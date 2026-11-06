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

test('encaissement au guichet : recherche, montant, confirmation, reçu, caisse, annulation', async ({
  page,
}) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/encaissements')

  await page.getByRole('searchbox', { name: /Rechercher l’élève/ }).fill('LAU-000002')
  await page
    .getByRole('button', { name: /^Choisir / })
    .first()
    .click()
  await expect(page.getByText('Montants proposés')).toBeVisible()

  const amount = page.getByLabel('Montant reçu (FCFA)')
  await amount.fill('0')
  await page.getByRole('button', { name: /^Encaisser/ }).click()
  await expect(page.getByText('Saisissez un montant entier supérieur à zéro.')).toBeVisible()

  await amount.fill('25 000')
  await page.getByText('Orange Money').click()
  await page.getByRole('button', { name: /^Encaisser 25/ }).click()
  await expect(
    page.getByText('La référence est obligatoire pour ce moyen de paiement.'),
  ).toBeVisible()
  await page.getByLabel('Référence de la transaction').fill('MP26110400123')
  await page.getByRole('button', { name: /^Encaisser 25/ }).click()

  const dialog = page.getByRole('dialog', { name: 'Confirmer l’encaissement' })
  await expect(dialog).toContainText('Orange Money')
  await dialog.getByRole('button', { name: 'Confirmer et émettre le reçu' }).click()

  await expect(page.getByText('Paiement enregistré')).toBeVisible()
  await expect(page.getByText('Reçu REC-2026-000002')).toBeVisible()
  await page.getByRole('link', { name: 'Imprimer le reçu' }).click()
  await expect(page.getByText('vingt-cinq mille francs CFA', { exact: false })).toBeVisible()
  await expect(page.getByText('MP26110400123')).toBeVisible()
  // Reçu PDF rendu par l'API : en préparation, puis lien signé
  const pdf = page.getByRole('link', { name: 'Télécharger le reçu (PDF)' })
  await expect(pdf).toBeVisible()
  await expect(pdf).toHaveAttribute('href', /\/api\/v1\/files\/receipts\/.+\.pdf\?/)
  await expect(pdf).toHaveAttribute('target', '_blank')

  // La direction annule le paiement : motif obligatoire, le reçu reste et porte la mention
  await page.getByRole('button', { name: 'Annuler ce paiement' }).click()
  const cancel = page.getByRole('dialog', { name: 'Annuler le paiement' })
  await expect(cancel.getByRole('button', { name: 'Annuler le paiement' })).toBeDisabled()
  await cancel.getByLabel('Motif de l’annulation').fill('Saisie sur le mauvais élève')
  await cancel.getByRole('button', { name: 'Annuler le paiement' }).click()
  await expect(page.getByText('Reçu annulé')).toBeVisible()
  await expect(page.getByText(/Saisie sur le mauvais élève/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Télécharger le reçu annulé (PDF)' })).toBeVisible()

  // Caisse du jour : ma caisse (encaissement et annulation), celle du comptable
  await page.getByRole('link', { name: 'Retour' }).click()
  await expect(page.getByRole('heading', { name: 'Caisse du jour', level: 1 })).toBeVisible()
  await expect(page.getByText(/^Ma caisse/)).toBeVisible()
  await expect(page.getByText(/^Caisse de Moussa Comptable/)).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Annulation' })).toBeVisible()
})

test('clôture de la caisse : espèces comptées, écart justifié, caisse figée', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.accountant })
  await page.goto('/les-lauriers/caisse')

  await expect(page.getByText(/^Ma caisse/)).toBeVisible()
  await page.getByRole('button', { name: 'Clôturer la caisse' }).click()
  const dialog = page.getByRole('dialog', { name: 'Clôture de ma caisse' })
  await dialog.getByLabel('Espèces comptées (FCFA)').fill('24000')
  await expect(dialog.getByText(/Écart : −1\s000/)).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Clôturer ma caisse' })).toBeDisabled()
  await dialog.getByLabel('Justification').fill('Monnaie rendue en trop')
  await dialog.getByRole('button', { name: 'Clôturer ma caisse' }).click()

  await expect(page.getByText('Caisse clôturée').first()).toBeVisible()
  await expect(page.getByText('Clôturée', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Clôturer la caisse' })).toHaveCount(0)
  await expect(page.getByText('Monnaie rendue en trop')).toBeVisible()
})

test('appel de classe : absent en un geste, enregistrement', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/presences')

  // Classes en appel uniquement (la crèche est en arrivées/départs, paramètre du cycle)
  const picker = page.getByRole('combobox', { name: 'Classe' })
  await expect(picker.locator('option', { hasText: 'Crèche' })).toHaveCount(0)
  await picker.selectOption({ label: 'CE2 A' })
  await expect(page.getByText(/présent\(s\)/)).toBeVisible()

  await page.getByRole('button', { name: 'Tous présents' }).click()
  await expect(page.getByText(/· 0 absent\(s\) ·/)).toBeVisible()
  const firstAbsent = page.getByRole('button', { name: /^Absent — / }).first()
  await firstAbsent.click()
  await expect(firstAbsent).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/· 1 absent\(s\) ·/)).toBeVisible()

  await page.getByRole('button', { name: 'Enregistrer l’appel' }).click()
  await expect(page.getByText('Appel enregistré : 1 absent(s)', { exact: true })).toBeVisible()
  await expect(page.getByText(/Appel enregistré par Yao Directeur/)).toBeVisible()
})

test('appel hors connexion : gardé sur l’appareil, envoyé au retour du réseau', async ({
  page,
  context,
}) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/presences')
  await page.getByRole('combobox', { name: 'Classe' }).selectOption({ label: 'CE2 A' })
  await expect(page.getByText(/· 0 absent\(s\) ·/)).toBeVisible()

  await context.setOffline(true)
  await page
    .getByRole('button', { name: /^Absent — / })
    .first()
    .click()
  await page.getByRole('button', { name: 'Enregistrer l’appel' }).click()
  await expect(page.getByText(/enregistré sur cet appareil/).first()).toBeVisible()
  await expect(page.getByText('1 élément(s) en attente d’envoi')).toBeVisible()

  await context.setOffline(false)
  await expect(page.getByText('1 saisie(s) hors connexion envoyée(s)').first()).toBeVisible()
  await expect(page.getByText('1 élément(s) en attente d’envoi')).toHaveCount(0)
})

test('garderie : arrivée d’un enfant et journal de la journée', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/garderie')

  await page.getByRole('button', { name: 'Arrivée' }).first().click()
  const arrival = page.getByRole('dialog')
  await arrival.getByLabel('Accompagné(e) par').fill('Maman')
  await arrival.getByLabel('Heure').fill('07:45')
  await arrival.getByRole('button', { name: 'Confirmer' }).click()
  await expect(page.getByText('Arrivé(e) à 07:45').first()).toBeVisible()
  await expect(page.getByText('Déposé(e) par Maman').first()).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter au journal' }).first().click()
  const log = page.getByRole('dialog')
  await log.getByLabel('Note').fill('Bouillie, tout mangé')
  await log.getByRole('button', { name: 'Ajouter' }).click()
  await expect(page.getByText('Bouillie, tout mangé')).toBeVisible()
})

test('saisie des notes au clavier : Entrée descend, note invalide signalée', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/notes')
  await expect(page.getByText('Évaluation 1').first()).toBeVisible()

  const cells = page.getByRole('textbox', { name: /^Note de .*, Évaluation 1$/ })
  await cells.first().fill('21')
  await expect(cells.first()).toHaveAttribute('aria-invalid', 'true')
  await cells.first().fill('15,5')
  await cells.first().press('Enter')
  await expect(cells.nth(1)).toBeFocused()
  await expect(cells.first()).toHaveAttribute('aria-invalid', 'false')
  await expect(page.getByText('Enregistré')).toBeVisible()
})

test('promoteur (consultation des notes) : grille en lecture seule', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.promoter })
  await page.goto('/les-lauriers/notes')
  const cell = page.getByRole('textbox', { name: /^Note de .*, Évaluation 1$/ }).first()
  await expect(cell).toHaveAttribute('readonly', '')
  await expect(page.getByRole('button', { name: 'Nouvelle évaluation' })).toHaveCount(0)
})

test('comptabilité : finances visibles, inscription et paramètres fermés', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.accountant })
  await page.goto('/les-lauriers/eleves')
  await expect(page.getByRole('heading', { name: 'Élèves', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Inscrire un élève' })).toHaveCount(0)

  await page.goto('/les-lauriers/inscriptions')
  await expect(page.getByRole('heading', { name: 'Accès réservé', level: 1 })).toBeVisible()
})

test('directrice limitée à la maternelle : seuls les élèves de maternelle', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.kindergartenDirector })
  await page.goto('/les-lauriers/eleves')

  const cycle = page.getByRole('combobox', { name: 'Cycle' })
  await expect(cycle.locator('option')).toHaveText(['Tous les cycles', 'Maternelle'])
  await expect(page.getByText(/^\d+ élèves$/)).toBeVisible()
  await expect(page.getByText(/^CE1 A$/)).toHaveCount(0)
})

test('garderie hors connexion : arrivée puis départ pendant la même coupure', async ({
  page,
  context,
}) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/garderie')
  await expect(page.getByRole('button', { name: 'Arrivée' }).first()).toBeVisible()

  await context.setOffline(true)
  await page.getByRole('button', { name: 'Arrivée' }).first().click()
  await page.getByRole('dialog').getByLabel('Heure').fill('07:40')
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click()
  await expect(page.getByText('Arrivé(e) à 07:40').first()).toBeVisible()

  await page.getByRole('button', { name: 'Départ' }).first().click()
  await page.getByRole('dialog').getByLabel('Heure').fill('12:10')
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click()
  await expect(page.getByText('Parti(e) à 12:10').first()).toBeVisible()
  await expect(page.getByText('2 élément(s) en attente d’envoi')).toBeVisible()

  await context.setOffline(false)
  await expect(page.getByText('2 saisie(s) hors connexion envoyée(s)').first()).toBeVisible()
  await expect(page.getByText('Parti(e) à 12:10').first()).toBeVisible()
})

test('nouvelle évaluation, absence, puis moyennes et rangs de la classe', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/notes')
  await expect(page.getByText('Évaluation 1').first()).toBeVisible()

  await page.getByRole('button', { name: 'Nouvelle évaluation' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Intitulé').fill('Dictée')
  await dialog.getByLabel('Barème (noté sur)').fill('10')
  await dialog.getByRole('button', { name: 'Créer' }).click()
  await expect(page.getByRole('columnheader', { name: /Dictée/ })).toBeVisible()

  const dictation = page.getByRole('textbox', { name: /^Note de .*, Dictée$/ })
  await dictation.first().fill('abs')
  await dictation.first().press('Enter')
  await expect(dictation.first()).toHaveAttribute('aria-invalid', 'false')
  await dictation.nth(1).fill('8')
  await dictation.nth(1).press('Enter')
  await expect(page.getByText('Enregistré')).toBeVisible()

  await page.getByRole('tab', { name: 'Moyennes et rangs' }).click()
  await expect(page.getByText('Moyenne de la classe')).toBeVisible()
  await expect(page.getByRole('cell', { name: '1er' })).toBeVisible()
})

test('paramètres des notes : coefficients du primaire et compétences de la maternelle', async ({
  page,
}) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/parametres')
  await page.getByRole('tab', { name: 'Notes' }).click()
  await expect(page.getByLabel('Nom de la période 1')).toBeVisible()

  await page.getByRole('combobox', { name: 'Cycle' }).selectOption({ label: 'Primaire' })
  await expect(page.getByLabel('Nom de la période 1')).toHaveValue('1er trimestre')
  await page.getByLabel('Coefficient de Anglais').fill('2')
  await page.getByRole('button', { name: /Enregistrer les matières de/ }).click()
  await expect(page.getByText('Réglages enregistrés').first()).toBeVisible()

  await page.getByRole('combobox', { name: 'Cycle' }).selectOption({ label: 'Maternelle' })
  await expect(page.getByText('Référentiel de compétences')).toBeVisible()
})

test('bulletins : appréciation, mention, validation puis déverrouillage motivé', async ({
  page,
}) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/bulletins')
  await expect(page.getByText('Bulletins non validés').first()).toBeVisible()
  await page.getByRole('combobox', { name: 'Classe' }).selectOption({ label: 'CE1 A' })
  await expect(page.getByText('Bulletin de notes')).toBeVisible()

  await page
    .getByRole('button', { name: /^Appréciations de / })
    .first()
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Appréciation générale de l’enseignant(e)').fill('Très bon trimestre.')
  await dialog.getByLabel('Observation de la direction').fill('Continuez ainsi.')
  await dialog.getByLabel('Mention').selectOption({ label: 'Encouragements' })
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Appréciations enregistrées').first()).toBeVisible()
  await expect(page.getByText('Rédigée').first()).toBeVisible()

  await page.getByRole('button', { name: 'Valider les bulletins' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Valider les bulletins' }).click()
  await expect(page.getByText(/^Validés le /)).toBeVisible()
  await expect(page.getByRole('link', { name: /^Bulletin PDF de / }).first()).toBeVisible()

  // Grille de notes figée
  await page.goto('/les-lauriers/notes')
  await page.getByRole('combobox', { name: 'Classe' }).selectOption({ label: 'CE1 A' })
  await expect(page.getByText(/Bulletins validés pour cette période/)).toBeVisible()

  await page.goto('/les-lauriers/bulletins')
  await page.getByRole('combobox', { name: 'Classe' }).selectOption({ label: 'CE1 A' })
  await page.getByRole('button', { name: 'Déverrouiller' }).click()
  const reopen = page.getByRole('dialog')
  await expect(reopen.getByRole('button', { name: 'Déverrouiller' })).toBeDisabled()
  await reopen.getByLabel('Motif du déverrouillage').fill('Note mal reportée')
  await reopen.getByRole('button', { name: 'Déverrouiller' }).click()
  await expect(page.getByText(/Déverrouillés le .* : Note mal reportée/)).toBeVisible()
})

test('annonce au primaire : publiée, lue par le parent, invisible pour la maternelle', async ({
  page,
}) => {
  const mock = await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/messages')
  await page.getByRole('tab', { name: 'Annonces' }).click()
  await expect(page.getByText('Kermesse de fin de trimestre')).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'SMS' })).toBeDisabled()

  await page.getByLabel('Titre').fill('Visite médicale')
  await page
    .getByLabel('Message', { exact: true })
    .fill('Lundi 16 novembre, apportez le carnet de santé.')
  await page.getByLabel('Destinataires').selectOption({ label: 'Primaire' })
  await page.getByRole('button', { name: 'Publier l’annonce' }).click()
  await expect(page.getByText(/Annonce publiée pour \d+ élève/).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Visite médicale' })).toBeVisible()
  for (const title of ['Cantine', 'Photos de classe']) {
    await page.getByLabel('Titre').fill(title)
    await page.getByLabel('Message', { exact: true }).fill('Information pour les familles.')
    await page.getByLabel('Destinataires').selectOption({ label: 'Toute l’école' })
    await page.getByRole('button', { name: 'Publier l’annonce' }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
  }

  mock.switchSession(ACCOUNTS.guardian)
  await page.goto('/les-lauriers/parent')
  await expect(page.getByRole('heading', { name: 'Visite médicale' })).toBeVisible()
  // Accueil : les 3 plus récentes, la plus ancienne sur demande
  await expect(page.getByRole('heading', { name: 'Kermesse de fin de trimestre' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Voir les 1 autre(s) annonce(s)' }).click()
  await expect(page.getByRole('heading', { name: 'Kermesse de fin de trimestre' })).toBeVisible()

  await expect(page.getByText('Réunion parents-enseignants')).toBeVisible()

  mock.switchSession(ACCOUNTS.kindergartenDirector)
  await page.goto('/les-lauriers/messages')
  await page.getByRole('tab', { name: 'Annonces' }).click()
  await expect(page.getByText('Kermesse de fin de trimestre')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Visite médicale' })).toHaveCount(0)
})

test('calendrier : la direction ajoute, modifie et supprime un événement', async ({ page }) => {
  await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/calendrier')
  // Liste « À venir » (la grille du mois est masquée sur téléphone)
  await expect(page.getByText('Réunion parents-enseignants').last()).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter un événement' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Intitulé').fill('Journée sportive')
  await dialog.getByLabel('Début').fill('2026-11-20')
  await dialog.getByLabel('Fin', { exact: true }).fill('2026-11-20')
  await dialog.getByLabel('Cycle concerné').selectOption({ label: 'Primaire' })
  await dialog.getByRole('button', { name: 'Ajouter' }).click()
  await expect(page.getByText('Événement enregistré').first()).toBeVisible()
  await expect(page.getByText('Journée sportive').last()).toBeVisible()

  await page.getByRole('button', { name: 'Modifier « Journée sportive »' }).click()
  await dialog.getByLabel('Intitulé').fill('Journée sportive et culturelle')
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Journée sportive et culturelle').last()).toBeVisible()

  await page.getByRole('button', { name: 'Supprimer « Journée sportive et culturelle »' }).click()
  await expect(page.getByText('Événement supprimé').first()).toBeVisible()
  await expect(page.getByText('Journée sportive et culturelle')).toHaveCount(0)
})

test('frais Mobile Money à la charge des parents : affichés avant le paiement', async ({
  page,
}) => {
  const mock = await mockApi(page, { session: ACCOUNTS.director })
  await page.goto('/les-lauriers/frais')
  // Bouton radio piloté par l'API : coché une fois la politique enregistrée
  await page.getByLabel('Ajoutés au montant payé par le parent').click()
  await expect(page.getByText('Politique enregistrée').first()).toBeVisible()
  await expect(page.getByLabel('Ajoutés au montant payé par le parent')).toBeChecked()
  await page.getByLabel('Taux des frais (%)').fill('1,5')
  await page.getByRole('button', { name: 'Enregistrer' }).last().click()
  await expect(page.getByLabel('Taux des frais (%)')).toHaveValue('1.5')

  mock.switchSession(ACCOUNTS.guardian)
  await page.goto('/les-lauriers/parent/paiements')
  await page.getByRole('button', { name: 'Payer pour Ange' }).click()
  const dialog = page.getByRole('dialog', { name: 'Payer par Mobile Money' })
  await dialog.getByLabel('Autre montant').check()
  await dialog.getByLabel('Montant (FCFA)').fill('15000')
  await expect(dialog.getByText(/Frais Mobile Money : 225/)).toBeVisible()
  await expect(dialog.getByRole('button', { name: /^Payer 15\s?225/ })).toBeVisible()
})
