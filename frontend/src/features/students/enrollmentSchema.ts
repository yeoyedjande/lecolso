import { z } from 'zod/mini'

import { normalizeCiPhone } from '@/lib/phone'

/** Formulaire d'inscription : messages = codes traduits par l'écran (enrollment.errors.*). */
export const RELATIONS = ['Père', 'Mère', 'Tuteur', 'Tutrice'] as const
export const ERROR_CODES = ['required', 'birthDate', 'phone', 'classroom', 'payer'] as const
export type ErrorCode = (typeof ERROR_CODES)[number]

const guardianSchema = z.object({
  name: z.string().check(z.trim(), z.minLength(2, 'required')),
  relation: z.enum(RELATIONS),
  phone: z.string().check(z.refine((value) => normalizeCiPhone(value) !== null, 'phone')),
  profession: z.string(),
  isPayer: z.boolean(),
})

export const enrollmentSchema = z.object({
  firstName: z.string().check(z.trim(), z.minLength(1, 'required')),
  lastName: z.string().check(z.trim(), z.minLength(1, 'required')),
  gender: z.enum(['F', 'M']),
  birthDate: z.string().check(z.regex(/^(19|20)\d{2}-\d{2}-\d{2}$/, 'birthDate')),
  district: z.string().check(z.trim(), z.minLength(2, 'required')),
  medicalNote: z.string(),
  guardians: z.array(guardianSchema).check(
    z.minLength(1, 'required'),
    z.refine((list) => list.some((guardian) => guardian.isPayer), 'payer'),
  ),
  classroomId: z.string().check(z.minLength(1, 'classroom')),
  options: z.array(z.enum(['registration', 'tuition', 'canteen', 'transport', 'daycare'])),
})

export type EnrollmentValues = z.infer<typeof enrollmentSchema>
