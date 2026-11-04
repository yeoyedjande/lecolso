import { describe, expect, it } from 'vitest'

import type { DemoClassroom } from '@/lib/demo/types'

import { IMPORT_COLUMNS, parseBirthDate, parseImport } from './import'

const classrooms: DemoClassroom[] = [
  { id: 'ce1-a', name: 'CE1 A', levelCode: 'CE1', cycle: 'primary', capacity: 30, teacher: 'Mme Aya Koné', room: 'Salle 1' },
]
const header = [...IMPORT_COLUMNS]
const valid = ['Kouassi', 'Aya', 'F', '14/03/2018', 'CE1 A', 'Cocody', 'Adjoua Kouassi', 'Mère', '07 00 00 00 00']

describe('import Excel des élèves', () => {
  it('ligne valide → inscription prête, téléphone en E.164', () => {
    const { rows, missingColumns } = parseImport([header, valid], classrooms)
    expect(missingColumns).toEqual([])
    expect(rows[0]?.errors).toEqual([])
    expect(rows[0]?.input).toMatchObject({ lastName: 'Kouassi', birthDate: '2018-03-14', classroomId: 'ce1-a' })
    expect(rows[0]?.input?.guardians[0]?.phone).toBe('+2250700000000')
  })

  it('erreurs ligne par ligne, avec le numéro de ligne du fichier', () => {
    const bad = ['', 'Yao', 'X', '31/02/2018', 'CM9 Z', '', 'K', 'Père', '1234']
    const { rows } = parseImport([header, valid, bad], classrooms)
    expect(rows[1]?.line).toBe(3)
    expect(rows[1]?.errors).toEqual(['lastName', 'gender', 'birthDate', 'classroom', 'guardian', 'phone'])
    expect(rows[1]?.input).toBeNull()
  })

  it('doublon dans le fichier signalé', () => {
    const { rows } = parseImport([header, valid, valid], classrooms)
    expect(rows[1]?.errors).toContain('duplicate')
  })

  it('colonnes manquantes : rien n’est importé', () => {
    const { rows, missingColumns } = parseImport([['Nom', 'Prénom'], ['A', 'B']], classrooms)
    expect(missingColumns).toContain('Classe')
    expect(rows).toEqual([])
  })

  it('en-têtes sans accents ni majuscules acceptés, lignes vides ignorées', () => {
    const loose = ['nom', 'prenom', 'sexe', 'date de naissance', 'classe', 'quartier', 'parent', 'lien', 'telephone']
    const { rows } = parseImport([loose, valid, ['', '', '']], classrooms)
    expect(rows).toHaveLength(1)
  })

  it.each([
    ['14/03/2018', '2018-03-14'],
    ['2018-03-14', '2018-03-14'],
    ['1/9/2019', '2019-09-01'],
    ['31/02/2018', null],
    ['14/03/1990', null],
  ])('date %s → %s', (input, expected) => {
    expect(parseBirthDate(input)).toBe(expected)
  })
})
