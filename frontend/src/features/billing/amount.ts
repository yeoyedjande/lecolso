/** Montant saisi au guichet : « 150 000 » → 150000 ; null si vide, décimal ou nul. */
export function parseAmount(text: string): number | null {
  // Espaces, espaces insécables (U+00A0, U+202F) et points comme séparateurs de milliers
  const digits = text.replace(/[\s\u00a0\u202f.]/g, '')
  if (!/^\d+$/.test(digits)) return null
  const value = Number(digits)
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

/** Montant d'une grille : comme parseAmount, mais 0 (ou vide) est accepté pour retirer un frais. */
export function parseAmountOrZero(text: string): number | null {
  if (text.trim() === '' || /^[\s\u00a0\u202f.]*0+$/.test(text)) return 0
  return parseAmount(text)
}
