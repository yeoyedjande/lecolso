/**
 * Formats d'affichage (frontend/CLAUDE.md) : dates JJ/MM/AAAA en Africa/Abidjan,
 * montants entiers en FCFA, téléphones E.164 ivoiriens.
 */
export const DISPLAY_TIME_ZONE = 'Africa/Abidjan'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: DISPLAY_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: DISPLAY_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const amountFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

function toDate(value: Date | string): Date {
  return typeof value === 'string' ? new Date(value) : value
}

/** « 2026-11-03T23:30:00Z » → « 03/11/2026 ». */
export function formatDate(value: Date | string): string {
  return dateFormatter.format(toDate(value))
}

/** « 2026-11-03T08:05:00Z » → « 03/11/2026 08:05 ». */
export function formatDateTime(value: Date | string): string {
  return dateTimeFormatter.format(toDate(value)).replace(',', '')
}

/** 15000 → « 15 000 FCFA » (montants entiers, sans centimes). Espaces insécables. */
export function formatMoney(amount: number): string {
  // Intl utilise une espace fine insécable (U+202F) comme séparateur de milliers en fr-FR
  return `${amountFormatter.format(amount).replace(/\u202f/g, '\u00a0')}\u00a0FCFA`
}

/** « +2250700000000 » → « +225 07 00 00 00 00 ». Autres numéros : renvoyés tels quels. */
export function formatPhone(e164: string): string {
  const match = /^\+225(\d{10})$/.exec(e164)
  if (match?.[1] === undefined) {
    return e164
  }
  const pairs = match[1].match(/\d{2}/g) ?? []
  return `+225 ${pairs.join(' ')}`
}
