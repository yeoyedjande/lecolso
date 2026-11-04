/**
 * Téléphones ivoiriens : saisie libre (« 07 00 00 00 00 », « +225 0700000000 », « 0700000000 »)
 * → E.164 « +2250700000000 » ; null si le numéro n'est pas un numéro ivoirien à 10 chiffres.
 */
export function normalizeCiPhone(input: string): string | null {
  const digits = input.replace(/[\s.\-()]/g, '')
  const local = digits.startsWith('+225') ? digits.slice(4) : digits.startsWith('00225') ? digits.slice(5) : digits
  return /^0[1-9]\d{8}$/.test(local) ? `+225${local}` : null
}
