import type { CycleCode } from '@/lib/cycles'

import { useCycles, type CycleSettings } from './api'

/**
 * Paramètres de chaque cycle de l'école (vraie API), par code. Les écrans choisissent leur comportement
 * (notes ou compétences, appel ou arrivées/départs, nombre de périodes) d'après ces paramètres, jamais d'après le nom.
 */
export function useCycleSettings(): {
  settings: Partial<Record<CycleCode, CycleSettings>>
  loading: boolean
} {
  const query = useCycles()
  const settings: Partial<Record<CycleCode, CycleSettings>> = {}
  for (const cycle of query.data ?? []) {
    if (cycle.code === 'daycare' || cycle.code === 'kindergarten' || cycle.code === 'primary') {
      settings[cycle.code] = cycle.settings
    }
  }
  return { settings, loading: query.isPending }
}

/** Nombre de périodes de l'année selon le type de période du cycle. */
export function termCount(settings: CycleSettings | undefined): number {
  if (settings?.term_type === 'semester') return 2
  return 3
}
