import type { components } from '@/lib/api/schema'
import { normalizeCiPhone } from '@/lib/phone'

/** Ligne envoyée à l'API (`POST students/import`), valeurs normalisées quand c'est possible. */
export type ImportRowBody = components['schemas']['ImportStudentsRequest']['rows'][number]

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

/** Codes d'erreur d'une ligne, renvoyés par l'API (une seule source de vérité). */
export const IMPORT_ERRORS = [
  'last_name',
  'first_name',
  'gender',
  'birth_date',
  'classroom',
  'year_closed',
  'classroom_full',
  'guardian',
  'phone',
  'duplicate',
] as const
export type ImportError = (typeof IMPORT_ERRORS)[number]

export interface ImportRow {
  /** Numéro de ligne dans le fichier (en-tête = ligne 1). */
  line: number
  values: Record<Column, string>
  body: ImportRowBody
}

export interface ImportResult {
  missingColumns: Column[]
  rows: ImportRow[]
}

function normalizeHeader(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(s\)/g, '').trim().toLowerCase()
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
  const [year, month, day] =
    french !== null
      ? [french[3], french[2], french[1]]
      : iso !== null
        ? [iso[1], iso[2], iso[3]]
        : []
  if (year === undefined || month === undefined || day === undefined) return null
  const value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const date = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null
  return value
}

function parseGender(text: string): string {
  const value = normalizeHeader(text)
  if (['f', 'fille', 'feminin'].includes(value)) return 'F'
  if (['m', 'g', 'garcon', 'masculin'].includes(value)) return 'M'
  return text
}

function parseRelation(text: string): 'mother' | 'father' | 'guardian' {
  const value = normalizeHeader(text)
  if (value === 'pere') return 'father'
  if (value === 'mere' || value === '') return 'mother'
  return 'guardian'
}

/**
 * Lit un tableau Excel (première ligne = en-têtes, sans accents ni casse imposés) : colonnes manquantes, puis une
 * ligne à envoyer à l'API par ligne non vide (dates JJ/MM/AAAA ou Excel en AAAA-MM-JJ, sexe en F/M, lien en code,
 * téléphone en E.164 quand c'est possible). L'API vérifie chaque ligne (classe, places, doublons).
 */
export function parseImport(sheet: readonly (readonly unknown[])[]): ImportResult {
  const [header = [], ...body] = sheet
  const positions = new Map<Column, number>()
  header.forEach((cell, index) => {
    const name = normalizeHeader(cellText(cell))
    const column = IMPORT_COLUMNS.find((candidate) => normalizeHeader(candidate) === name)
    if (column !== undefined) positions.set(column, index)
  })
  const missingColumns = IMPORT_COLUMNS.filter((column) => !positions.has(column))
  if (missingColumns.length > 0) return { missingColumns, rows: [] }

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
    const line = index + 2
    rows.push({
      line,
      values,
      body: {
        line,
        last_name: values.Nom,
        first_name: values['Prénom'],
        gender: parseGender(values.Sexe),
        birth_date: parseBirthDate(values['Date de naissance']) ?? values['Date de naissance'],
        classroom: values.Classe,
        address: values.Quartier === '' ? null : values.Quartier,
        guardian_name: values.Parent,
        guardian_relation: parseRelation(values.Lien),
        guardian_phone: normalizeCiPhone(values['Téléphone']) ?? values['Téléphone'],
      },
    })
  })
  return { missingColumns, rows }
}
