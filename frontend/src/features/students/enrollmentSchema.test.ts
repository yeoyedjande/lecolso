import { describe, expect, it } from 'vitest'

import { enrollmentSchema } from './enrollmentSchema'

const valid = {
  firstName: 'Aya',
  lastName: 'Kouassi',
  gender: 'F',
  birthDate: '2019-03-14',
  district: 'Cocody Angré',
  medicalNote: '',
  guardians: [
    {
      name: 'Adjoua Kouassi',
      relation: 'Mère',
      phone: '07 00 00 00 00',
      profession: '',
      isPayer: true,
    },
  ],
  classroomId: 'lau-ce1-a',
  options: ['canteen'],
}

function codes(input: unknown): string[] {
  const result = enrollmentSchema.safeParse(input)
  return result.success
    ? []
    : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`)
}

describe('formulaire d’inscription', () => {
  it('accepte une inscription complète', () => {
    expect(codes(valid)).toEqual([])
  })

  it('exige un payeur parmi les parents', () => {
    expect(codes({ ...valid, guardians: [{ ...valid.guardians[0], isPayer: false }] })).toContain(
      'guardians:payer',
    )
  })

  it('refuse un téléphone non ivoirien et une date invalide', () => {
    const result = codes({
      ...valid,
      birthDate: '14/03/2019',
      guardians: [{ ...valid.guardians[0], phone: '+33612345678' }],
    })
    expect(result).toContain('birthDate:birthDate')
    expect(result).toContain('guardians.0.phone:phone')
  })

  it('exige une classe', () => {
    expect(codes({ ...valid, classroomId: '' })).toContain('classroomId:classroom')
  })
})
