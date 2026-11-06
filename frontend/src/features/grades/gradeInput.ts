/**
 * Note saisie : « 12,5 », « 12.75 », « 15 » → nombre ; '' → null (pas de note) ;
 * undefined si invalide (hors 0..max ou pas un multiple de 0,25).
 */
export function parseGrade(text: string, max = 20): number | null | undefined {
  const value = text.trim().replace(',', '.')
  if (value === '') return null
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(value)) return undefined
  const grade = Number(value)
  if (grade < 0 || grade > max || Math.round(grade * 4) !== grade * 4) return undefined
  return grade
}

/** 12.5 → « 12,5 » ; null → ''. */
export function formatGrade(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',')
}

/** Cellule de la grille : note, « abs » (absent), vide (non saisie) ; undefined si invalide. */
export function parseCell(
  text: string,
  max: number,
): { value: number | null; absent: boolean } | undefined {
  if (/^\s*(a|abs|absent)\s*$/i.test(text)) return { value: null, absent: true }
  const value = parseGrade(text, max)
  return value === undefined ? undefined : { value, absent: false }
}

/** Affichage d'une cellule : « 12,5 », « abs », ''. */
export function formatCell(cell: { value: number | null; absent: boolean }): string {
  return cell.absent ? 'abs' : formatGrade(cell.value)
}

/**
 * Moyenne d'une matière sur l'échelle du cycle, comme le serveur : notes ramenées (14/20 → 7/10), absences et cellules
 * vides ignorées, arrondi au centième.
 */
export function subjectAverage(
  cells: readonly { value: number | null; absent: boolean; outOf: number }[],
  scale: number,
): number | null {
  const scores = cells
    .filter((cell) => !cell.absent && cell.value !== null && cell.outOf > 0)
    .map((cell) => ((cell.value ?? 0) / cell.outOf) * scale)
  if (scores.length === 0) return null
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100
}

/** Rang de compétition (1, 1, 3) d'après les rangs du serveur : ex æquo si un autre élève a le même rang. */
export function rankOf(
  rank: number | null,
  all: readonly (number | null)[],
): { rank: number; tied: boolean } | null {
  if (rank === null) return null
  return { rank, tied: all.filter((other) => other === rank).length > 1 }
}
