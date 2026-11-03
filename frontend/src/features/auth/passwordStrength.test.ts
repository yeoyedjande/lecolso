import { describe, expect, it } from 'vitest'

import { passwordScore, strengthLevel } from './passwordStrength'

describe('robustesse du mot de passe', () => {
  it.each([
    ['', 0, 'weak'],
    ['court', 1, 'weak'],
    ['abcdefgh', 1, 'weak'],
    ['abcdefghijkl', 2, 'fair'],
    ['Abcdefghijkl', 3, 'good'],
    ['Abidjan-Cocody-2026', 4, 'strong'],
  ] as const)('%j → %i (%s)', (password, score, level) => {
    expect(passwordScore(password)).toBe(score)
    expect(strengthLevel(passwordScore(password))).toBe(level)
  })
})
