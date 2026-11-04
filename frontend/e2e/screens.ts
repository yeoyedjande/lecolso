import type { Page } from '@playwright/test'

import { ACCOUNTS, mockApi, type Account } from './mock-api.ts'

/** Écrans de l'étape 6a, avec le compte connecté et l'établissement choisi pour les afficher. */
export interface Screen {
  name: string
  path: string
  session?: Account
  school?: string
  /** Écran du back-office : vérifié aussi en mode sombre. */
  dark?: boolean
  /** Texte attendu avant l'analyse ou la capture (données chargées). */
  ready: string | RegExp
}

/** Date fixe des tests : les données de démonstration en dépendent. */
export const DEMO_NOW = new Date('2026-11-04T09:30:00Z')

const LAURIERS = '0195f000-0000-7000-8000-000000000001'

export const SCREENS: Screen[] = [
  { name: 'connexion', path: '/connexion', ready: 'Bon retour parmi nous' },
  {
    name: 'mot-de-passe-provisoire',
    path: '/mot-de-passe',
    session: ACCOUNTS.provisional,
    ready: 'Choisissez votre mot de passe',
  },
  {
    name: 'etablissements',
    path: '/etablissements',
    session: ACCOUNTS.promoter,
    ready: 'Choisissez un établissement',
  },
  {
    name: 'gestion-accueil',
    path: '/gestion',
    session: ACCOUNTS.director,
    school: LAURIERS,
    dark: true,
    ready: 'Encaissements par mois',
  },
  ...(
    [
      ['gestion-eleves', '/gestion/eleves', /^\d+ élèves$/],
      ['gestion-fiche-eleve', '/gestion/eleves/lau-el-0001', 'Matricule'],
      ['gestion-inscription', '/gestion/inscriptions', 'Étape 1 sur 4'],
      ['gestion-import', '/gestion/import', 'Colonnes attendues (première ligne du fichier)'],
      ['gestion-classes', '/gestion/classes', 'Enseignant(e) titulaire'],
      [
        'gestion-encaissement',
        '/gestion/encaissements?eleve=lau-el-0001',
        'Reste à payer sur l’année',
      ],
      ['gestion-recu', '/gestion/recus/pay-lau-00001', /Arrêté le présent reçu/],
      ['gestion-impayes', '/gestion/impayes', 'Total en retard'],
      ['gestion-caisse', '/gestion/caisse', 'Par moyen de paiement'],
      ['gestion-echeanciers', '/gestion/echeanciers', 'Recouvrement'],
      ['gestion-frais', '/gestion/frais', 'Optionnel'],
      ['gestion-notes', '/gestion/notes', 'Évaluation 1'],
      ['gestion-competences', '/gestion/competences', 'Langage oral'],
      ['gestion-bulletins', '/gestion/bulletins', /Complet|Notes manquantes/],
      ['gestion-presences', '/gestion/presences', /présent\(s\)/],
      ['gestion-garderie', '/gestion/garderie', /enfant\(s\) présent\(s\)/],
      ['gestion-messages', '/gestion/messages', 'Retard du matin'],
      ['gestion-calendrier', '/gestion/calendrier', 'À venir ce mois-ci'],
      ['gestion-parametres', '/gestion/parametres', 'Nom de l’établissement'],
      ['gestion-profil', '/gestion/profil', 'Établissements et rôles'],
    ] as const
  ).map(([name, path, ready]): Screen => ({
    name,
    path,
    ready,
    session: ACCOUNTS.director,
    school: LAURIERS,
    dark: true,
  })),
  ...(
    [
      ['enseignant-accueil', '/enseignant', 'Faire l’appel'],
      ['enseignant-appel', '/enseignant/appel', /présent\(s\)/],
      ['enseignant-notes', '/enseignant/notes', 'Évaluation'],
      [
        'enseignant-journal',
        '/enseignant/journal',
        'Aucune de vos classes ne tient de journal quotidien (paramètre du cycle).',
      ],
      ['enseignant-messages', '/enseignant/messages', 'Nouveau message'],
      ['enseignant-profil', '/enseignant/profil', 'Changer mon mot de passe'],
    ] as const
  ).map(([name, path, ready]): Screen => ({
    name,
    path,
    ready,
    session: ACCOUNTS.teacher,
    school: LAURIERS,
  })),
  ...(
    [
      ['parent-accueil', '/parent', 'Reste à payer'],
      ['parent-enfant', '/parent/enfants/lau-el-0001', 'Journal'],
      ['parent-paiements', '/parent/paiements', 'Payer par Mobile Money'],
      ['parent-messages', '/parent/messages', 'Devoirs de la semaine'],
      ['parent-justifier', '/parent/justifier', 'Envoyer la justification'],
      ['parent-profil', '/parent/profil', 'Changer mon mot de passe'],
    ] as const
  ).map(([name, path, ready]): Screen => ({
    name,
    path,
    ready,
    session: ACCOUNTS.guardian,
    school: LAURIERS,
  })),
  { name: 'design', path: '/design', dark: true, ready: 'Design system' },
  { name: 'introuvable', path: '/nulle-part', ready: 'Page introuvable' },
  { name: 'etat', path: '/etat', ready: 'API : OK' },
]

/** Prépare la page : API simulée, établissement mémorisé, thème, animations coupées. */
export async function openScreen(
  page: Page,
  screen: Screen,
  theme: 'light' | 'dark' = 'light',
): Promise<void> {
  await mockApi(page, screen.session !== undefined ? { session: screen.session } : {})
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.setFixedTime(DEMO_NOW)
  await page.addInitScript(
    ({ school, theme }) => {
      if (school !== null) window.localStorage.setItem('gestion-ecole.school-id', school)
      window.localStorage.setItem('lecolso-ui.theme', theme)
    },
    { school: screen.school ?? null, theme },
  )
  await page.goto(screen.path)
  await page.getByText(screen.ready).first().waitFor()
  await page.evaluate(() => document.fonts.ready)
}
