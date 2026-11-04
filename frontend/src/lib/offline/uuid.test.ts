import { describe, expect, it } from 'vitest'

import { uuidv7 } from './uuid'

describe('uuidv7', () => {
  it('produit un UUID version 7 valide', () => {
    expect(uuidv7()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('encode le timestamp en tête, donc les identifiants sont triables', () => {
    const first = uuidv7(Date.UTC(2026, 10, 3, 8, 0, 0))
    const second = uuidv7(Date.UTC(2026, 10, 3, 8, 0, 1))

    expect(first.slice(0, 13)).toBe('01a1a06c-1400')
    expect(first < second).toBe(true)
  })
})
