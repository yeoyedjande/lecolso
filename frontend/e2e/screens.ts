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
  /** Texte attendu avant l'analyse ou la capture (page chargée). */
  ready: string
}

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
    ready: 'Bonjour, Yao',
  },
  {
    name: 'gestion-bientot',
    path: '/gestion/eleves',
    session: ACCOUNTS.director,
    school: LAURIERS,
    dark: true,
    ready: 'Bientôt disponible',
  },
  {
    name: 'enseignant-accueil',
    path: '/enseignant',
    session: ACCOUNTS.teacher,
    school: LAURIERS,
    ready: 'Bonjour, Fatou',
  },
  {
    name: 'parent-accueil',
    path: '/parent',
    session: ACCOUNTS.guardian,
    school: LAURIERS,
    ready: 'Bonjour, Kouadio',
  },
  {
    name: 'parent-bientot',
    path: '/parent/paiements',
    session: ACCOUNTS.guardian,
    school: LAURIERS,
    ready: 'Bientôt disponible',
  },
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
