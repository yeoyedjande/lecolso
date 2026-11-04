import { describe, expect, it } from 'vitest'

import { normalizeCiPhone } from './phone'

describe('normalizeCiPhone', () => {
  it.each([
    ['07 00 00 00 00', '+2250700000000'],
    ['0700000000', '+2250700000000'],
    ['+225 05 12 34 56 78', '+2250512345678'],
    ['00225 01-23-45-67-89', '+2250123456789'],
    ['27 22 41 00 00', null],
    ['0700', null],
    ['+33612345678', null],
  ])('%s → %s', (input, expected) => {
    expect(normalizeCiPhone(input)).toBe(expected)
  })
})
