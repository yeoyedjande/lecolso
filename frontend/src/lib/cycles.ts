/**
 * Couleur de chaque cycle, partout dans l'interface (pastilles, graphiques, en-têtes).
 * Correspondance de présentation par code de catalogue (config/cycles.php côté API) ; un code inconnu
 * (V2, V3) prend la teinte neutre. Le comportement métier, lui, vient toujours des settings du cycle.
 */
export type CycleTone = 'daycare' | 'kindergarten' | 'primary' | 'other'

/** Codes de cycle ayant une teinte propre (catalogue V1). */
export type CycleCode = Exclude<CycleTone, 'other'>

const TONES: Record<string, CycleTone> = {
  daycare: 'daycare',
  kindergarten: 'kindergarten',
  primary: 'primary',
}

export function cycleTone(code: string | null | undefined): CycleTone {
  return (code !== null && code !== undefined ? TONES[code] : undefined) ?? 'other'
}

/** Couleurs brutes (graphiques Recharts, SVG) : mêmes valeurs que les tokens de index.css. */
export const CYCLE_HEX: Record<CycleTone, string> = {
  daycare: '#F97362',
  kindergarten: '#F5B700',
  primary: '#3B82F6',
  other: '#A89F91',
}

/** Classes Tailwind par teinte (fond doux + texte AA, point de couleur, bordure). */
export const CYCLE_CLASSES: Record<
  CycleTone,
  { soft: string; dot: string; border: string; ink: string }
> = {
  daycare: {
    soft: 'bg-cycle-daycare-soft text-cycle-daycare-ink',
    dot: 'bg-cycle-daycare',
    border: 'border-cycle-daycare',
    ink: 'text-cycle-daycare-ink',
  },
  kindergarten: {
    soft: 'bg-cycle-kindergarten-soft text-cycle-kindergarten-ink',
    dot: 'bg-cycle-kindergarten',
    border: 'border-cycle-kindergarten',
    ink: 'text-cycle-kindergarten-ink',
  },
  primary: {
    soft: 'bg-cycle-primary-soft text-cycle-primary-ink',
    dot: 'bg-cycle-primary',
    border: 'border-cycle-primary',
    ink: 'text-cycle-primary-ink',
  },
  other: {
    soft: 'bg-cycle-other-soft text-cycle-other-ink',
    dot: 'bg-cycle-other',
    border: 'border-cycle-other',
    ink: 'text-cycle-other-ink',
  },
}

/**
 * Couleurs des cycles pour les graphiques (barres, segments), validées avec l'outil de palette :
 * le jaune soleil de la charte (#F5B700) est trop clair pour une marque, d'où #E0A500 ; en sombre,
 * le corail est légèrement assombri. Toujours accompagnées d'étiquettes directes et d'un tableau.
 */
export const CYCLE_CHART: Record<'light' | 'dark', Record<CycleTone, string>> = {
  light: { daycare: '#F97362', kindergarten: '#E0A500', primary: '#3B82F6', other: '#8B8378' },
  dark: { daycare: '#F06A58', kindergarten: '#E0A500', primary: '#3B82F6', other: '#A89F91' },
}
