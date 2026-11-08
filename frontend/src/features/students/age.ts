/** Âge en années révolues à une date (AAAA-MM-JJ). */
export function ageOf(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  if (
    by === undefined ||
    bm === undefined ||
    bd === undefined ||
    ty === undefined ||
    tm === undefined ||
    td === undefined
  )
    return 0
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0)
}
