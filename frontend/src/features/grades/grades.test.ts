import { describe, expect, it } from 'vitest'

import { average, ranks, weightedAverage } from './demo'
import { formatGrade, parseGrade } from './gradeInput'

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

describe('moyennes et rangs', () => {
  it('moyenne simple : absences ignorées, arrondi au centième', () => {
    expect(average([12, 13, null, 14.5])).toBe(13.17)
    expect(average([null, null])).toBeNull()
  })

  it('moyenne pondérée par les coefficients', () => {
    expect(
      weightedAverage([
        { value: 10, coefficient: 3 },
        { value: 16, coefficient: 1 },
        { value: null, coefficient: 2 },
      ]),
    ).toBe(11.5)
  })

  it('rangs avec ex æquo, élèves sans moyenne non classés', () => {
    const result = ranks(
      new Map([
        ['a', 15],
        ['b', 12],
        ['c', 15],
        ['d', 9],
        ['e', null],
      ]),
    )
    expect(result.get('a')).toEqual({ rank: 1, tied: true })
    expect(result.get('c')).toEqual({ rank: 1, tied: true })
    expect(result.get('b')).toEqual({ rank: 3, tied: false })
    expect(result.get('d')).toEqual({ rank: 4, tied: false })
    expect(result.has('e')).toBe(false)
  })
})
