import { describe, expect, it } from 'vitest'

import { formatDate, formatDateTime, formatMoney, formatPhone } from './format'

describe('formatDate', () => {
  it('affiche JJ/MM/AAAA dans le fuseau Africa/Abidjan', () => {
    expect(formatDate('2026-11-03T23:30:00Z')).toBe('03/11/2026')
    expect(formatDate(new Date(Date.UTC(2027, 0, 5)))).toBe('05/01/2027')
  })

  it('affiche la date et l’heure', () => {
    expect(formatDateTime('2026-11-03T08:05:00Z')).toBe('03/11/2026 08:05')
  })
})

describe('formatMoney', () => {
  it('affiche des FCFA entiers avec séparateur de milliers', () => {
    expect(formatMoney(15000)).toBe('15\u00a0000\u00a0FCFA')
    expect(formatMoney(0)).toBe('0\u00a0FCFA')
    expect(formatMoney(1250000)).toBe('1\u00a0250\u00a0000\u00a0FCFA')
  })
})

describe('formatPhone', () => {
  it('groupe un numéro ivoirien E.164 par paires', () => {
    expect(formatPhone('+2250700000000')).toBe('+225 07 00 00 00 00')
  })

  it('laisse les autres numéros inchangés', () => {
    expect(formatPhone('+33612345678')).toBe('+33612345678')
  })
})
