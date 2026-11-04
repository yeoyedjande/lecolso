/** Montant saisi au guichet : « 150 000 » → 150000 ; null si vide, décimal ou nul. */
export function parseAmount(text: string): number | null {
  const digits = text.replace(/[\s  .]/g, '')
  if (!/^\d+$/.test(digits)) return null
  const value = Number(digits)
  return Number.isSafeInteger(value) && value > 0 ? value : null
}
