import { describe, expect, it } from 'vitest'

import { parseAmount } from './amount'

describe('montant saisi au guichet', () => {
  it.each([
    ['150 000', 150_000],
    ['150 000', 150_000],
    ['25.000', 25_000],
    ['0', null],
    ['', null],
    ['12,5', null],
    ['-500', null],
  ])('« %s » → %s', (text, expected) => {
    expect(parseAmount(text)).toBe(expected)
  })
})
