import { env } from '@/lib/env'

import { generateSchool } from './dataset'
import { demoToday } from './dates'
import type { DemoSchool } from './types'

/**
 * Magasin des données de démonstration, en mémoire (perdu au rechargement) : une école par établissement
 * sélectionné. Les écritures (encaissement, appel, notes…) modifient ce magasin pour que tous les écrans restent cohérents.
 */
const schools = new Map<string, DemoSchool>()

export interface DemoKey {
  id: string
  slug: string
}

export function demoSchool(key: DemoKey): DemoSchool {
  let school = schools.get(key.id)
  if (school === undefined) {
    school = generateSchool(key.slug)
    schools.set(key.id, school)
  }
  return school
}

/** Pour les tests : repart des données générées. */
export function resetDemo(): void {
  schools.clear()
}

export function today(): string {
  return demoToday()
}

/** Module sans backend et données de démonstration désactivées (VITE_DEMO_MODULES=false). */
export class ModuleUnavailableError extends Error {
  override readonly name = 'ModuleUnavailableError'

  constructor() {
    super('Module pas encore disponible')
  }
}

/** Latence simulée, pour que les états de chargement restent visibles et réalistes. */
const LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 180

/** Exécute une lecture ou une écriture de démonstration (ou échoue si la démo est désactivée). */
export async function demo<T>(run: () => T): Promise<T> {
  if (!env.demoModules) throw new ModuleUnavailableError()
  if (LATENCY_MS > 0) await new Promise((resolve) => setTimeout(resolve, LATENCY_MS))
  return run()
}

let counter = 0
/** Identifiant local unique (les vraies données auront des UUID générés par l'API ou hors connexion). */
export function demoId(prefix: string): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${String(counter)}`
}
