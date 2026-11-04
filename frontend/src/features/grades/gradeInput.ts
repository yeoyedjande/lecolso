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
