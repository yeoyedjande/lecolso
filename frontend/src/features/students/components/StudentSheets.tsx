import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useState, type ReactNode, type SyntheticEvent } from 'react'
import { Controller, useForm, type FieldPath } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod/mini'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { FormAlert } from '@/features/auth/components/FormAlert'
import { ValidationError } from '@/lib/api/errors'
import { formatPhone } from '@/lib/format'
import { toast } from '@/lib/toast'

import {
  useAddGuardian,
  useUpdateGuardian,
  useUpdateStudent,
  type StudentFile,
  type StudentGuardian,
} from '../api'
import {
  guardianPayload,
  guardianSchema,
  studentFieldsSchema,
  studentPayload,
  type StudentFieldsValues,
} from '../enrollmentSchema'
import { GuardianFields, StudentFields } from './StudentFormFields'

const STUDENT_FIELDS: Record<string, keyof StudentFieldsValues> = {
  first_name: 'firstName',
  last_name: 'lastName',
  gender: 'gender',
  birth_date: 'birthDate',
  birth_place: 'birthPlace',
  address: 'address',
  blood_type: 'bloodType',
  allergies: 'allergies',
  medical_notes: 'medicalNotes',
}

function SheetLayout({
  title,
  description,
  failed,
  submitting,
  onCancel,
  onSubmit,
  children,
}: {
  title: string
  description: string
  failed: boolean
  submitting: boolean
  onCancel: () => void
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="grid gap-1.5 border-b px-6 pt-6 pr-16 pb-4">
        <SheetTitle className="font-display text-xl font-bold">{title}</SheetTitle>
        <SheetDescription className="text-sm text-muted-foreground">{description}</SheetDescription>
      </div>
      <div className="grid flex-1 content-start gap-5 overflow-y-auto px-6 py-5">
        {failed && <FormAlert>{t('enrollment.failed')}</FormAlert>}
        {children}
      </div>
      <div className="flex justify-end gap-2 border-t px-6 py-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="accent" disabled={submitting}>
          <Save aria-hidden />
          {t('students.detail.save')}
        </Button>
      </div>
    </form>
  )
}

const studentFormSchema = z.object({ student: studentFieldsSchema })
type StudentForm = z.infer<typeof studentFormSchema>

/** Modification du dossier (identité et, pour qui peut les voir, données médicales). */
export function StudentEditSheet({ file, onDone }: { file: StudentFile; onDone: () => void }) {
  const { t } = useTranslation()
  const update = useUpdateStudent(file.id)
  const [failed, setFailed] = useState(false)
  const medical = file.medical
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StudentForm>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      student: {
        firstName: file.first_name,
        lastName: file.last_name,
        gender: file.gender,
        birthDate: file.birth_date,
        birthPlace: file.birth_place ?? '',
        address: file.address ?? '',
        bloodType: medical?.blood_type ?? '',
        allergies: medical?.allergies ?? '',
        medicalNotes: medical?.medical_notes ?? '',
      },
    },
  })

  const submit = handleSubmit(async (values) => {
    setFailed(false)
    try {
      await update.mutateAsync(studentPayload(values.student, medical !== null))
      toast(t('students.detail.saved'), { tone: 'success' })
      onDone()
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        setFailed(true)
        return
      }
      for (const [key, messages] of Object.entries(error.fields)) {
        const field = STUDENT_FIELDS[key]
        const text = messages[0]
        if (field !== undefined && text !== undefined)
          setError(`student.${field}`, { type: 'server', message: text })
      }
    }
  })

  return (
    <SheetLayout
      title={t('students.detail.editTitle', { name: file.full_name })}
      description={t('students.detail.editDescription')}
      failed={failed}
      submitting={isSubmitting}
      onCancel={onDone}
      onSubmit={(event) => void submit(event)}
    >
      <StudentFields
        field={(name) => register(`student.${name}`)}
        errors={errors.student}
        medical={medical !== null}
      />
    </SheetLayout>
  )
}

const guardianFormSchema = z.object({
  guardians: z.array(guardianSchema),
  isPrimaryContact: z.boolean(),
})
type GuardianForm = z.infer<typeof guardianFormSchema>
const GUARDIAN_FIELDS = ['name', 'phone', 'email', 'profession', 'relation'] as const

/** Ajout (guardian null) ou modification d'un tuteur du dossier, et de son lien avec l'élève. */
export function GuardianSheet({
  file,
  guardian,
  onDone,
}: {
  file: StudentFile
  guardian: StudentGuardian | null
  onDone: () => void
}) {
  const { t } = useTranslation()
  const add = useAddGuardian(file.id)
  const update = useUpdateGuardian(file.id)
  const [failed, setFailed] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<GuardianForm>({
    resolver: zodResolver(guardianFormSchema),
    defaultValues: {
      guardians: [
        {
          name: guardian?.name ?? '',
          relation: guardian?.relation ?? 'guardian',
          phone: guardian === null ? '' : formatPhone(guardian.phone),
          email: guardian?.email ?? '',
          profession: guardian?.profession ?? '',
          isPayer: guardian?.is_payer ?? false,
          canPickUp: guardian?.can_pick_up ?? true,
        },
      ],
      isPrimaryContact: guardian?.is_primary_contact ?? false,
    },
  })

  const submit = handleSubmit(async (values) => {
    const input = values.guardians[0]
    if (input === undefined) return
    setFailed(false)
    try {
      const payload = { ...guardianPayload(input), is_primary_contact: values.isPrimaryContact }
      if (guardian === null) await add.mutateAsync(payload)
      else await update.mutateAsync({ guardianId: guardian.id, input: payload })
      toast(
        guardian === null
          ? t('students.guardians.added', { name: payload.name })
          : t('students.guardians.saved', { name: payload.name }),
        { tone: 'success' },
      )
      onDone()
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        setFailed(true)
        return
      }
      for (const field of GUARDIAN_FIELDS) {
        const text = error.fields[field]?.[0]
        if (text !== undefined) setError(`guardians.0.${field}`, { type: 'server', message: text })
      }
      for (const [key, target] of [
        ['is_payer', 'guardians.0.isPayer'],
        ['is_primary_contact', 'isPrimaryContact'],
      ] satisfies [string, FieldPath<GuardianForm>][]) {
        const text = error.fields[key]?.[0]
        if (text !== undefined) setError(target, { type: 'server', message: text })
      }
    }
  })

  // Le payeur et le contact principal ne se retirent pas : on les donne à un autre tuteur
  const flags = [
    ['guardians.0.isPayer', 'payer', guardian?.is_payer === true],
    ['isPrimaryContact', 'primary', guardian?.is_primary_contact === true],
    ['guardians.0.canPickUp', 'pickUp', false],
  ] satisfies [FieldPath<GuardianForm>, string, boolean][]

  return (
    <SheetLayout
      title={
        guardian === null
          ? t('students.guardians.addTitle')
          : t('students.guardians.editTitle', { name: guardian.name })
      }
      description={t('students.guardians.description')}
      failed={failed}
      submitting={isSubmitting}
      onCancel={onDone}
      onSubmit={(event) => void submit(event)}
    >
      <GuardianFields
        field={(name) => register(`guardians.0.${name}`)}
        errors={errors.guardians?.[0]}
      />
      <div className="grid gap-3">
        {flags.map(([name, key, locked]) => (
          <Controller
            key={key}
            control={control}
            name={name}
            render={({ field, fieldState }) => (
              <div className="grid gap-1">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`guardian-${key}`}
                    checked={field.value}
                    disabled={locked}
                    onCheckedChange={(checked) => {
                      field.onChange(checked === true)
                    }}
                  />
                  <Label htmlFor={`guardian-${key}`}>
                    {key === 'payer'
                      ? t('enrollment.payer')
                      : key === 'primary'
                        ? t('students.guardians.primary')
                        : t('enrollment.canPickUp')}
                  </Label>
                </div>
                {locked && (
                  <p className="pl-8 text-[13px] text-muted-foreground">
                    {t('students.guardians.lockedFlag')}
                  </p>
                )}
                {fieldState.error?.message !== undefined && (
                  <p role="alert" className="pl-8 text-[13px] font-medium text-destructive-ink">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
        ))}
      </div>
    </SheetLayout>
  )
}
