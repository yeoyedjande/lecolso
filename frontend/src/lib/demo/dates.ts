/** Dates de démonstration : année scolaire 2026-2027, « aujourd'hui » borné à l'année scolaire. */
export const YEAR_START = '2026-09-14'
export const YEAR_END = '2027-06-30'
export const YEAR_LABEL = '2026-2027'

/** Date du jour (AAAA-MM-JJ, Africa/Abidjan = UTC), ramenée dans l'année scolaire. */
export function demoToday(now: Date = new Date()): string {
  const today = now.toISOString().slice(0, 10)
  if (today < YEAR_START) return '2026-11-04'
  if (today > YEAR_END) return YEAR_END
  return today
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function isSchoolDay(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  return day !== 0 && day !== 6
}

/** Jours de classe (lundi-vendredi) entre deux dates incluses, hors vacances. */
export function schoolDays(
  from: string,
  to: string,
  holidays: readonly [string, string][] = [],
): string[] {
  const days: string[] = []
  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (isSchoolDay(date) && !holidays.some(([start, end]) => date >= start && date <= end))
      days.push(date)
  }
  return days
}

export function at(date: string, time: string): string {
  return `${date}T${time}:00Z`
}
