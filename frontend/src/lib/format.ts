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

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: DISPLAY_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
})
const longDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: DISPLAY_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const monthFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: DISPLAY_TIME_ZONE,
  month: 'long',
  year: 'numeric',
})
const shortMonthFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: DISPLAY_TIME_ZONE,
  month: 'short',
})
const dayMonthFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: DISPLAY_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
})
const decimalFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Date seule « 2026-11-04 » : interprétée à midi UTC pour ne jamais changer de jour. */
function toDay(value: string): Date {
  return new Date(value.length === 10 ? `${value}T12:00:00Z` : value)
}

/** « 2026-11-04T08:05:00Z » → « 08:05 ». */
export function formatTime(value: Date | string): string {
  return timeFormatter.format(toDate(value))
}

/** « 2026-11-04 » → « mercredi 4 novembre 2026 ». */
export function formatLongDate(value: string): string {
  return longDateFormatter.format(toDay(value))
}

/** « 2026-11 » → « novembre 2026 ». */
export function formatMonth(value: string): string {
  return monthFormatter.format(toDay(`${value.slice(0, 7)}-15`))
}

/** « 2026-11 » → « nov. ». */
export function formatShortMonth(value: string): string {
  return shortMonthFormatter.format(toDay(`${value.slice(0, 7)}-15`))
}

/** « 2026-11-04 » → « 04/11 ». */
export function formatDayMonth(value: string): string {
  return dayMonthFormatter.format(toDay(value))
}

/** Date seule (AAAA-MM-JJ) → JJ/MM/AAAA, sans décalage de fuseau. */
export function formatDay(value: string): string {
  return dateFormatter.format(toDay(value))
}

/** Moyenne sur 20 : 14.256 → « 14,26 » ; null → « — ». */
export function formatAverage(value: number | null): string {
  return value === null ? '—' : decimalFormatter.format(value)
}

/** Rang : 1 → « 1er », 2 → « 2e » ; ex æquo → « 2e ex ». */
export function formatRank(rank: { rank: number; tied: boolean } | null): string {
  if (rank === null) return '—'
  return `${String(rank.rank)}${rank.rank === 1 ? 'er' : 'e'}${rank.tied ? ' ex' : ''}`
}
