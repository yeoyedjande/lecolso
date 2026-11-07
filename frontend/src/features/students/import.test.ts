import { describe, expect, it } from 'vitest'

import { ImportSchoolChanged, runImportBatches } from './api'
import { IMPORT_COLUMNS, parseBirthDate, parseImport } from './import'

const header = [...IMPORT_COLUMNS]
const valid = [
  'Kouassi',
  'Aya',
  'F',
  '14/03/2018',
  'CE1 A',
  'Cocody',
  'Adjoua Kouassi',
  'Mère',
  '07 00 00 00 00',
]

describe('import Excel des élèves (lecture du fichier)', () => {
  it('ligne lue → valeurs normalisées pour l’API : date, sexe, lien, téléphone en E.164', () => {
    const { rows, missingColumns } = parseImport([header, valid])
    expect(missingColumns).toEqual([])
    expect(rows[0]?.body).toEqual({
      line: 2,
      last_name: 'Kouassi',
      first_name: 'Aya',
      gender: 'F',
      birth_date: '2018-03-14',
      classroom: 'CE1 A',
      address: 'Cocody',
      guardian_name: 'Adjoua Kouassi',
      guardian_relation: 'mother',
      guardian_phone: '+2250700000000',
    })
  })

  it('valeurs illisibles transmises telles quelles, l’API les signale, avec le numéro de ligne du fichier', () => {
    const bad = ['', 'Yao', 'X', '31/02/2018', 'CM9 Z', '', 'K', 'Père', '1234']
    const { rows } = parseImport([header, valid, bad])
    expect(rows[1]?.line).toBe(3)
    expect(rows[1]?.body).toMatchObject({
      gender: 'X',
      birth_date: '31/02/2018',
      guardian_relation: 'father',
      guardian_phone: '1234',
      address: null,
    })
  })

  it('colonnes manquantes : rien n’est envoyé', () => {
    const { rows, missingColumns } = parseImport([
      ['Nom', 'Prénom'],
      ['A', 'B'],
    ])
    expect(missingColumns).toContain('Classe')
    expect(rows).toEqual([])
  })

  it('en-têtes sans accents ni majuscules acceptés, lignes vides ignorées', () => {
    const loose = [
      'nom',
      'prenom',
      'sexe',
      'date de naissance',
      'classe',
      'quartier',
      'parent',
      'lien',
      'telephone',
    ]
    const { rows } = parseImport([loose, valid, ['', '', '']])
    expect(rows).toHaveLength(1)
  })

  it.each([
    ['14/03/2018', '2018-03-14'],
    ['2018-03-14', '2018-03-14'],
    ['1/9/2019', '2019-09-01'],
    ['31/02/2018', null],
  ])('date %s → %s', (input, expected) => {
    expect(parseBirthDate(input)).toBe(expected)
  })
})

describe('import Excel des élèves (envoi par lots)', () => {
  const first = parseImport([header, valid]).rows[0]
  if (first === undefined) throw new Error('Ligne de test attendue')
  const rows = Array.from({ length: 120 }, (_, index) => ({ ...first.body, line: index + 2 }))
  const reply = (batch: typeof rows) =>
    Promise.resolve({
      rows: batch.map((row) => ({
        line: row.line,
        status: 'created',
        errors: [],
        student_id: null,
        matricule: null,
      })),
      counts: { ready: 0, created: batch.length, skipped: 0, error: 0 },
    })

  it('envoie les lignes par lots de 50 et suit la progression', async () => {
    const sizes: number[] = []
    const progress: number[] = []
    const results = await runImportBatches(rows, {
      currentSchool: () => 'school-a',
      send: (batch) => {
        sizes.push(batch.length)
        return reply(batch)
      },
      onProgress: (done) => progress.push(done),
    })
    expect(sizes).toEqual([50, 50, 20])
    expect(progress).toEqual([50, 100, 120])
    expect(results).toHaveLength(120)
  })

  it('s’arrête avant le lot suivant si l’établissement actif change', async () => {
    let school = 'school-a'
    const sizes: number[] = []
    await expect(
      runImportBatches(rows, {
        currentSchool: () => school,
        send: (batch) => {
          sizes.push(batch.length)
          school = 'school-b'
          return reply(batch)
        },
        onProgress: () => undefined,
      }),
    ).rejects.toBeInstanceOf(ImportSchoolChanged)
    expect(sizes).toEqual([50])
  })
})
