import { describe, expect, it } from 'vitest'

import { amountInWords } from './amountInWords'

describe('amountInWords', () => {
  it.each([
    [0, 'zéro'],
    [21, 'vingt-et-un'],
    [71, 'soixante-et-onze'],
    [80, 'quatre-vingts'],
    [91, 'quatre-vingt-onze'],
    [200, 'deux cents'],
    [1000, 'mille'],
    [25_000, 'vingt-cinq mille'],
    [150_000, 'cent cinquante mille'],
    [200_000, 'deux cent mille'],
    [1_250_000, 'un million deux cent cinquante mille'],
    [2_000_080, 'deux millions quatre-vingts'],
  ])('%i → %s', (amount, words) => {
    expect(amountInWords(amount)).toBe(words)
  })
})
