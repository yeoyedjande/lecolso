import { describe, expect, it } from 'vitest'

import { enrollmentPayload, enrollmentSchema, type EnrollmentValues } from './enrollmentSchema'

const valid: EnrollmentValues = {
  student: {
    firstName: ' Aya ',
    lastName: 'Kouassi',
    gender: 'F',
    birthDate: '2019-03-14',
    birthPlace: '',
    address: 'Cocody Angré',
    bloodType: 'O+',
    allergies: 'Arachide',
    medicalNotes: '',
  },
  guardians: [
    {
      name: 'Adjoua Kouassi',
      relation: 'mother',
      phone: '07 00 00 00 00',
      email: '',
      profession: '',
      isPayer: true,
      canPickUp: true,
    },
  ],
  classroomId: '0195f000-0000-7000-8000-0000000b0003',
}

function codes(input: unknown): string[] {
  const result = enrollmentSchema.safeParse(input)
  return result.success
    ? []
    : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`)
}

describe('enrollmentSchema', () => {
  it('accepte une inscription complète', () => {
    expect(codes(valid)).toEqual([])
  })

  it('signale chaque champ invalide par un code', () => {
    expect(
      codes({
        ...valid,
        student: { ...valid.student, firstName: ' ', birthDate: '14/03/2019' },
        classroomId: '',
      }),
    ).toEqual([
      'student.firstName:required',
      'student.birthDate:birthDate',
      'classroomId:classroom',
    ])
  })

  it('exige un téléphone ivoirien et un seul payeur', () => {
    const guardian = valid.guardians[0]
    if (guardian === undefined) throw new Error('fixture')
    expect(codes({ ...valid, guardians: [{ ...guardian, phone: '123' }] })).toEqual([
      'guardians.0.phone:phone',
    ])
    expect(
      codes({ ...valid, guardians: [guardian, { ...guardian, phone: '05 00 00 00 00' }] }),
    ).toEqual(['guardians:payer'])
  })
})

describe('enrollmentPayload', () => {
  it('normalise le téléphone, fait du premier tuteur le contact principal', () => {
    const payload = enrollmentPayload(valid, true)
    expect(payload.student).toMatchObject({
      first_name: 'Aya',
      birth_place: null,
      blood_type: 'O+',
    })
    expect(payload.guardians[0]).toMatchObject({
      phone: '+2250700000000',
      is_primary_contact: true,
      is_payer: true,
      email: null,
    })
  })

  it('n’envoie pas les données médicales sans le droit de les saisir', () => {
    const payload = enrollmentPayload(valid, false)
    expect('allergies' in payload.student).toBe(false)
    expect('blood_type' in payload.student).toBe(false)
  })
})
