import { describe, expect, it } from 'vitest'

import {
  formatCell,
  formatGrade,
  parseCell,
  parseGrade,
  rankOf,
  subjectAverage,
} from './gradeInput'

describe('saisie des notes', () => {
  it.each([
    ['12', 12],
    ['12,5', 12.5],
    ['12.75', 12.75],
    ['0', 0],
    ['20', 20],
    ['', null],
    ['  ', null],
    ['21', undefined],
    ['12,3', undefined],
    ['-1', undefined],
    ['abc', undefined],
  ])('« %s » → %s', (text, expected) => {
    expect(parseGrade(text)).toBe(expected)
  })

  it('affichage à la française', () => {
    expect(formatGrade(12.5)).toBe('12,5')
    expect(formatGrade(null)).toBe('')
  })
})

describe('grille de notes', () => {
  it('lit « abs » comme une absence, une note dans le barème, refuse le reste', () => {
    expect(parseCell('abs', 10)).toEqual({ value: null, absent: true })
    expect(parseCell(' A ', 10)).toEqual({ value: null, absent: true })
    expect(parseCell('7,5', 10)).toEqual({ value: 7.5, absent: false })
    expect(parseCell('', 10)).toEqual({ value: null, absent: false })
    expect(parseCell('12', 10)).toBeUndefined()
    expect(formatCell({ value: null, absent: true })).toBe('abs')
    expect(formatCell({ value: 7.5, absent: false })).toBe('7,5')
  })

  it('ramène les notes sur l’échelle du cycle comme le serveur', () => {
    expect(
      subjectAverage(
        [
          { value: 14, absent: false, outOf: 20 },
          { value: 9, absent: false, outOf: 10 },
          { value: null, absent: true, outOf: 10 },
        ],
        10,
      ),
    ).toBe(8)
    expect(subjectAverage([{ value: null, absent: false, outOf: 20 }], 10)).toBeNull()
  })

  it('signale les ex æquo', () => {
    expect(rankOf(1, [1, 1, 3])).toEqual({ rank: 1, tied: true })
    expect(rankOf(3, [1, 1, 3])).toEqual({ rank: 3, tied: false })
    expect(rankOf(null, [1])).toBeNull()
  })
})
