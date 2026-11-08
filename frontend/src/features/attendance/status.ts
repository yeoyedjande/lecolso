/** Statut d'une justification lu dans l'API (chaîne) : clé de traduction connue. */
export function justificationKey(status: string | null): 'pending' | 'accepted' | 'refused' {
  return status === 'accepted' || status === 'refused' ? status : 'pending'
}

/** Date du jour de l'école (Abidjan est à UTC+0 toute l'année). */
export function schoolToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/** Dernier jour d'un mois AAAA-MM. */
export function monthEnd(month: string): string {
  const [year, value] = month.split('-').map(Number)
  const last = new Date(Date.UTC(year ?? 1970, value ?? 1, 0))
  return last.toISOString().slice(0, 10)
}
