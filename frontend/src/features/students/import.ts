import { normalizeCiPhone } from '@/lib/phone'
import type { DemoClassroom, Gender } from '@/lib/demo/types'

import type { EnrollmentInput } from './demo'

/** Colonnes attendues dans le fichier Excel (première ligne), dans cet ordre ou non. */
export const IMPORT_COLUMNS = [
  'Nom',
  'Prénom',
  'Sexe',
  'Date de naissance',
  'Classe',
  'Quartier',
  'Parent',
  'Lien',
  'Téléphone',
] as const

type Column = (typeof IMPORT_COLUMNS)[number]

export type ImportError =
  | 'missingColumns'
  | 'lastName'
  | 'firstName'
  | 'gender'
  | 'birthDate'
  | 'classroom'
  | 'guardian'
  | 'phone'
  | 'duplicate'

export interface ImportRow {
  /** Numéro de ligne dans le fichier (en-tête = ligne 1). */
  line: number
  values: Record<Column, string>
  errors: ImportError[]
  input: EnrollmentInput | null
}

export interface ImportResult {
  missingColumns: Column[]
  rows: ImportRow[]
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(s\)/g, '')
    .trim()
    .toLowerCase()
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

/** « 14/03/2019 », « 2019-03-14 » ou une date Excel → « 2019-03-14 » ; null si invalide. */
export function parseBirthDate(text: string): string | null {
  const french = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text)
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  const [year, month, day] = french !== null ? [french[3], french[2], french[1]] : iso !== null ? [iso[1], iso[2], iso[3]] : []
  if (year === undefined || month === undefined || day === undefined) return null
  const value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const date = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null
  if (Number(year) < 2005 || Number(year) > 2025) return null
  return value
}

function parseGender(text: string): Gender | null {
  const value = normalizeHeader(text)
  if (['f', 'fille', 'feminin'].includes(value)) return 'F'
  if (['m', 'g', 'garcon', 'masculin'].includes(value)) return 'M'
  return null
}

function parseRelation(text: string): 'Père' | 'Mère' | 'Tuteur' | 'Tutrice' {
  const value = normalizeHeader(text)
  if (value === 'pere') return 'Père'
  if (value === 'tuteur') return 'Tuteur'
  if (value === 'tutrice') return 'Tutrice'
  return 'Mère'
}

/**
 * Vérifie un tableau lu depuis Excel (première ligne = en-têtes) : chaque ligne reçoit ses erreurs, et
 * une ligne valide devient une inscription. Les doublons (même nom, prénom et date de naissance) sont signalés.
 */
export function parseImport(sheet: readonly (readonly unknown[])[], classrooms: readonly DemoClassroom[]): ImportResult {
  const [header = [], ...body] = sheet
  const positions = new Map<Column, number>()
  header.forEach((cell, index) => {
    const name = normalizeHeader(cellText(cell))
    const column = IMPORT_COLUMNS.find((candidate) => normalizeHeader(candidate) === name)
    if (column !== undefined) positions.set(column, index)
  })
  const missingColumns = IMPORT_COLUMNS.filter((column) => !positions.has(column))
  if (missingColumns.length > 0) return { missingColumns, rows: [] }

  const seen = new Set<string>()
  const rows: ImportRow[] = []
  body.forEach((cells, index) => {
    const cell = (column: Column): string => cellText(cells[positions.get(column) ?? -1])
    const values: Record<Column, string> = {
      Nom: cell('Nom'),
      Prénom: cell('Prénom'),
      Sexe: cell('Sexe'),
      'Date de naissance': cell('Date de naissance'),
      Classe: cell('Classe'),
      Quartier: cell('Quartier'),
      Parent: cell('Parent'),
      Lien: cell('Lien'),
      Téléphone: cell('Téléphone'),
    }
    if (IMPORT_COLUMNS.every((column) => values[column] === '')) return

    const errors: ImportError[] = []
    const gender = parseGender(values.Sexe)
    const birthDate = parseBirthDate(values['Date de naissance'])
    const classroom = classrooms.find((candidate) => normalizeHeader(candidate.name) === normalizeHeader(values.Classe))
    const phone = normalizeCiPhone(values['Téléphone'])
    if (values.Nom === '') errors.push('lastName')
    if (values['Prénom'] === '') errors.push('firstName')
    if (gender === null) errors.push('gender')
    if (birthDate === null) errors.push('birthDate')
    if (classroom === undefined) errors.push('classroom')
    if (values.Parent.length < 2) errors.push('guardian')
    if (phone === null) errors.push('phone')
    const key = normalizeHeader(`${values.Nom}|${values['Prénom']}|${birthDate ?? ''}`)
    if (seen.has(key)) errors.push('duplicate')
    seen.add(key)

    rows.push({
      line: index + 2,
      values,
      errors,
      input:
        errors.length > 0 || gender === null || birthDate === null || classroom === undefined || phone === null
          ? null
          : {
              lastName: values.Nom,
              firstName: values['Prénom'],
              gender,
              birthDate,
              district: values.Quartier,
              medicalNote: null,
              classroomId: classroom.id,
              options: [],
              guardians: [{ name: values.Parent, relation: parseRelation(values.Lien), phone, profession: '', isPayer: true }],
            },
    })
  })
  return { missingColumns, rows }
}
