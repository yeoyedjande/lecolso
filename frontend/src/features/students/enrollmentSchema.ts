import { z } from 'zod/mini'

import { normalizeCiPhone } from '@/lib/phone'

import { BLOOD_TYPES, RELATIONS, type EnrollStudentInput, type GuardianInput } from './api'

/** Messages = codes traduits par les écrans (enrollment.errors.*). */
export const ERROR_CODES = [
  'required',
  'birthDate',
  'phone',
  'email',
  'classroom',
  'payer',
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]

export function isErrorCode(value: string | undefined): value is ErrorCode {
  return ERROR_CODES.some((code) => code === value)
}

const optionalText = z.string()

export const studentFieldsSchema = z.object({
  firstName: z.string().check(z.trim(), z.minLength(1, 'required'), z.maxLength(80, 'required')),
  lastName: z.string().check(z.trim(), z.minLength(1, 'required'), z.maxLength(80, 'required')),
  gender: z.enum(['F', 'M']),
  birthDate: z.string().check(z.regex(/^(199\d|20\d{2})-\d{2}-\d{2}$/, 'birthDate')),
  birthPlace: optionalText,
  address: optionalText,
  bloodType: z.union([z.enum(BLOOD_TYPES), z.literal('')]),
  allergies: optionalText,
  medicalNotes: optionalText,
})

export const guardianSchema = z.object({
  name: z.string().check(z.trim(), z.minLength(2, 'required')),
  relation: z.enum(RELATIONS),
  phone: z.string().check(z.refine((value) => normalizeCiPhone(value) !== null, 'phone')),
  email: z
    .string()
    .check(
      z.refine(
        (value) => value.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
        'email',
      ),
    ),
  profession: optionalText,
  isPayer: z.boolean(),
  canPickUp: z.boolean(),
})

export const enrollmentSchema = z.object({
  student: studentFieldsSchema,
  guardians: z.array(guardianSchema).check(
    z.minLength(1, 'required'),
    z.refine((list) => list.filter((guardian) => guardian.isPayer).length === 1, 'payer'),
  ),
  classroomId: z.string().check(z.minLength(1, 'classroom')),
  /** Codes des services optionnels choisis (cantine, transport…), facturés avec l'inscription. */
  options: z.array(z.string()),
})

export type StudentFieldsValues = z.infer<typeof studentFieldsSchema>
export type GuardianValues = z.infer<typeof guardianSchema>
export type EnrollmentValues = z.infer<typeof enrollmentSchema>

const nullable = (value: string): string | null => (value.trim() === '' ? null : value.trim())

/** Champs du dossier pour l'API ; médicaux seulement si l'utilisateur peut les saisir. */
export function studentPayload(values: StudentFieldsValues, withMedical: boolean) {
  return {
    first_name: values.firstName.trim(),
    last_name: values.lastName.trim(),
    gender: values.gender,
    birth_date: values.birthDate,
    birth_place: nullable(values.birthPlace),
    address: nullable(values.address),
    ...(withMedical
      ? {
          blood_type: values.bloodType === '' ? null : values.bloodType,
          allergies: nullable(values.allergies),
          medical_notes: nullable(values.medicalNotes),
        }
      : {}),
  }
}

export function guardianPayload(values: GuardianValues): GuardianInput {
  return {
    name: values.name.trim(),
    phone: normalizeCiPhone(values.phone) ?? values.phone,
    email: nullable(values.email),
    profession: nullable(values.profession),
    relation: values.relation,
    is_payer: values.isPayer,
    can_pick_up: values.canPickUp,
  }
}

/** Le premier tuteur est le contact principal. */
export function enrollmentPayload(
  values: EnrollmentValues,
  withMedical: boolean,
): EnrollStudentInput {
  return {
    classroom_id: values.classroomId,
    options: values.options,
    student: studentPayload(values.student, withMedical),
    guardians: values.guardians.map((guardian, index) => ({
      ...guardianPayload(guardian),
      is_primary_contact: index === 0,
    })),
  }
}
