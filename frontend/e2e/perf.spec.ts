import { expect, test, type Page } from '@playwright/test'

import { ACCOUNTS, mockApi } from './mock-api.ts'
import { DEMO_NOW } from './screens.ts'

/**
 * Mesure de navigation (npm run e2e:perf) : temps entre le clic sur une entrée du menu et le contenu
 * complètement affiché (titre visible, aucun squelette, aucune animation d'entrée en cours).
 * Conditions dégradées : processeur ralenti 4 fois (Android d'entrée de gamme) et 200 ms par appel d'API
 * (aller-retour Abidjan ↔ Europe). Résultats en console ; échoue au-delà du budget.
 */
interface Stopwatch {
  start: number
  end: number
  h1: number
}

declare global {
  interface Window {
    __perf?: Stopwatch
  }
}

const LAURIERS = '0195f000-0000-7000-8000-000000000001'
const API_DELAY_MS = 200
const BUDGET_MS = 600

const MENU = [
  'Élèves',
  'Encaissements',
  'Impayés',
  'Caisse du jour',
  'Notes',
  'Présences',
  'Messages',
  'Paramètres',
  'Tableau de bord',
]

/**
 * Chronomètre installé dans la page (indépendant des vérifications de Playwright avant le clic) :
 * départ à l'événement click sur un lien du menu, arrivée à la première image où le contenu est complet
 * (titre visible, aucun squelette, aucune animation d'entrée en cours).
 */
function installStopwatch(): void {
  const state: Stopwatch = { start: 0, end: 0, h1: 0 }
  window.__perf = state
  const ready = (): boolean => {
    const main = document.querySelector('main')
    if (main?.querySelector('h1') == null) return false
    if (main.querySelector('[data-slot="skeleton"]') !== null) return false
    for (const element of Array.from(main.querySelectorAll<HTMLElement>('[style*="opacity"]'))) {
      if (Number(getComputedStyle(element).opacity) < 1) return false
    }
    return true
  }
  document.addEventListener(
    'click',
    () => {
      state.start = performance.now()
      state.end = 0
      state.h1 = 0
      const previous = document.querySelector('main h1')
      const tick = () => {
        const heading = document.querySelector('main h1')
        if (state.h1 === 0 && heading !== null && heading !== previous) state.h1 = performance.now()
        if (state.h1 !== 0 && ready()) {
          state.end = performance.now()
          return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    },
    true,
  )
}

async function measure(page: Page): Promise<{ total: number; heading: number }> {
  await page.waitForFunction(() => (window.__perf?.end ?? 0) > 0)
  return page.evaluate(() => {
    const perf = window.__perf ?? { start: 0, end: 0, h1: 0 }
    return {
      total: Math.round(perf.end - perf.start),
      heading: Math.round(perf.h1 - perf.start),
    }
  })
}

test('navigation dans le back-office', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1280', 'mesure sur le poste de bureau')
  await page.clock.setFixedTime(DEMO_NOW)
  await page.addInitScript((school) => {
    window.localStorage.setItem('gestion-ecole.school-id', school)
  }, LAURIERS)
  await page.addInitScript(installStopwatch)
  await mockApi(page, { session: ACCOUNTS.director })
  // Enregistrée après mockApi, donc appliquée en premier : retard puis passage à l'API simulée
  await page.route('http://api.e2e.test/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, API_DELAY_MS))
    await route.fallback()
  })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  await page.goto('/les-lauriers/tableau-de-bord')
  await page.locator('main h1').first().waitFor()
  // Laisse le préchargement des écrans du menu se terminer, comme pour un utilisateur qui lit la page
  await page.waitForLoadState('networkidle')

  const results: { screen: string; heading: number; total: number }[] = []
  // Deux passages : premier affichage, puis retour sur un écran déjà visité
  for (const pass of [1, 2]) {
    for (const label of MENU) {
      await page.getByRole('navigation').getByRole('link', { name: label, exact: true }).click()
      const { heading, total } = await measure(page)
      results.push({ screen: `${label} (${String(pass)})`, heading, total })
    }
  }

  console.table(results)
  const average = Math.round(results.reduce((sum, { total }) => sum + total, 0) / results.length)
  console.log(`Moyenne : ${String(average)} ms`)
  for (const { screen, total } of results) {
    expect.soft(total, screen).toBeLessThan(BUDGET_MS)
  }
})
