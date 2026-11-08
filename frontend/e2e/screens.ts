import type { Page } from '@playwright/test'

import { ACCOUNTS, lauriersStudentId, mockApi, type Account } from './mock-api.ts'

/** Écrans de l'application (adresses par chemin /{slug}/…), avec le compte connecté et la dernière école utilisée. */
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
    path: '/les-lauriers/tableau-de-bord',
    session: ACCOUNTS.director,
    school: LAURIERS,
    dark: true,
    ready: 'Encaissements par mois',
  },
  ...(
    [
      ['gestion-eleves', '/les-lauriers/eleves', /^25 élèves affichés/],
      ['gestion-fiche-eleve', `/les-lauriers/eleves/${lauriersStudentId(1)}`, 'Matricule'],
      ['gestion-inscription', '/les-lauriers/inscriptions', 'Étape 1 sur 4'],
      ['gestion-pre-inscriptions', '/les-lauriers/pre-inscriptions', 'TOURÉ Mariam'],
      ['gestion-import', '/les-lauriers/import', 'Colonnes attendues (première ligne du fichier)'],
      ['gestion-classes', '/les-lauriers/classes', 'CM2 A'],
      [
        'gestion-encaissement',
        `/les-lauriers/encaissements?eleve=${lauriersStudentId(1)}`,
        'Montants proposés',
      ],
      ['gestion-recu', '/les-lauriers/recus/pay-lau-00001', /Arrêté le présent reçu/],
      ['gestion-impayes', '/les-lauriers/impayes', 'Total en retard'],
      ['gestion-caisse', '/les-lauriers/caisse', 'Caisse de Moussa Comptable'],
      ['gestion-echeanciers', '/les-lauriers/echeanciers', 'Total de l’année'],
      ['gestion-frais', '/les-lauriers/frais', 'Calendrier des échéances'],
      ['gestion-notes', '/les-lauriers/notes', 'Évaluation 1'],
      ['gestion-competences', '/les-lauriers/competences', 'Langage oral'],
      ['gestion-bulletins', '/les-lauriers/bulletins', 'Bulletins non validés'],
      ['gestion-presences', '/les-lauriers/presences', /présent\(s\)/],
      ['gestion-garderie', '/les-lauriers/garderie', /enfant\(s\) présent\(s\)/],
      ['gestion-messages', '/les-lauriers/messages', 'Retard du matin'],
      ['gestion-calendrier', '/les-lauriers/calendrier', 'À venir ce mois-ci'],
      ['gestion-parametres', '/les-lauriers/parametres', 'Nom de l’établissement'],
      ['gestion-roles', '/les-lauriers/roles', 'Fondateur ou propriétaire'],
      ['gestion-utilisateurs', '/les-lauriers/utilisateurs', 'Moussa Comptable'],
      ['gestion-profil', '/les-lauriers/profil', 'Établissements et rôles'],
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
      ['enseignant-accueil', '/les-lauriers/enseignant', 'Faire l’appel'],
      ['enseignant-appel', '/les-lauriers/enseignant/appel', /présent\(s\)/],
      // Une ligne de la grille : écran chargé (la liste « Matière » n'est plus en attente)
      ['enseignant-notes', '/les-lauriers/enseignant/notes', 'KOUADIO Ange'],
      [
        'enseignant-journal',
        '/les-lauriers/enseignant/journal',
        'Aucun cycle de l’école n’est suivi en arrivées et départs.',
      ],
      ['enseignant-appreciations', '/les-lauriers/enseignant/appreciations', 'À rédiger'],
      ['enseignant-eleves', '/les-lauriers/enseignant/eleves', 'Mes élèves'],
      ['enseignant-messages', '/les-lauriers/enseignant/messages', 'Nouveau message'],
      ['enseignant-profil', '/les-lauriers/enseignant/profil', 'Changer mon mot de passe'],
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
      ['parent-accueil', '/les-lauriers/parent', 'Reste à payer'],
      [
        'parent-enfant',
        '/les-lauriers/parent/enfants/0195f000-0000-7000-8000-100000000023',
        'Français',
      ],
      ['parent-paiements', '/les-lauriers/parent/paiements', 'Payer pour Ange'],
      ['parent-messages', '/les-lauriers/parent/messages', 'Devoirs de la semaine'],
      ['parent-justifier', '/les-lauriers/parent/justifier', 'Envoyer la justification'],
      ['parent-prevenir', '/les-lauriers/parent/prevenir', 'Prévenir l’école'],
      ['parent-profil', '/les-lauriers/parent/profil', 'Changer mon mot de passe'],
    ] as const
  ).map(([name, path, ready]): Screen => ({
    name,
    path,
    ready,
    session: ACCOUNTS.guardian,
    school: LAURIERS,
  })),
  {
    name: 'plateforme-ecoles',
    path: '/plateforme',
    session: ACCOUNTS.superAdmin,
    dark: true,
    ready: 'Petits Génies',
  },
  {
    name: 'plateforme-nouvelle',
    path: '/plateforme/nouvelle',
    session: ACCOUNTS.superAdmin,
    dark: true,
    ready: 'Directeur ou directrice',
  },
  { name: 'ecole-publique', path: '/les-lauriers', ready: 'Pré-inscrire mon enfant' },
  {
    name: 'ecole-preinscription',
    path: '/les-lauriers/preinscription',
    ready: 'Niveau souhaité',
  },
  {
    name: 'ecole-inconnue',
    path: '/inconnue',
    ready: 'Cette école n’existe pas ou n’a pas encore de page.',
  },
  { name: 'design', path: '/design', dark: true, ready: 'Design system' },
  {
    name: 'introuvable',
    path: '/les-lauriers/nulle-part',
    session: ACCOUNTS.director,
    school: LAURIERS,
    ready: 'Page introuvable',
  },
  {
    name: 'ecole-sans-affectation',
    path: '/petits-genies/eleves',
    session: ACCOUNTS.director,
    school: LAURIERS,
    ready: 'Page introuvable',
  },
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
