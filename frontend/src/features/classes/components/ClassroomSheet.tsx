import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod/mini'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { FormAlert } from '@/features/auth/components/FormAlert'
import type { Cycle } from '@/features/cycles/api'
import { ValidationError } from '@/lib/api/errors'
import { toast } from '@/lib/toast'

import { useSaveClassroom, type Classroom } from '../api'

const schema = z.object({
  level_id: z.string().check(z.minLength(1, 'level')),
  section: z.string().check(z.trim(), z.minLength(1, 'section'), z.maxLength(10, 'section')),
  capacity: z
    .string()
    .check(
      z.refine(
        (value) => value.trim() === '' || /^(?:[1-9]\d?|1\d\d|200)$/.test(value.trim()),
        'capacity',
      ),
    ),
  room: z.string(),
  homeroom_teacher_id: z.string(),
})

type Values = z.infer<typeof schema>
const SERVER_FIELDS = ['level_id', 'section', 'capacity', 'room', 'homeroom_teacher_id'] as const

export interface TeacherOption {
  id: string
  name: string
}

/** Création ou modification d'une classe (panneau latéral) ; seuls les niveaux des cycles gérés sont proposés. */
export function ClassroomSheet({
  classroom,
  cycles,
  manageableCycleIds,
  teachers,
  onDone,
}: {
  classroom: Classroom | null
  cycles: Cycle[]
  /** null : tous les cycles de l'école. */
  manageableCycleIds: readonly string[] | null
  /** null : liste des comptes non disponible (le titulaire actuel est conservé). */
  teachers: TeacherOption[] | null
  onDone: () => void
}) {
  const { t } = useTranslation()
  const save = useSaveClassroom()
  const [failed, setFailed] = useState(false)
  const levels = cycles
    .filter((cycle) => manageableCycleIds === null || manageableCycleIds.includes(cycle.id))
    .flatMap((cycle) => cycle.levels.map((level) => ({ ...level, cycleName: cycle.name })))

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      level_id: classroom?.level.id ?? '',
      section: classroom?.section ?? '',
      capacity:
        classroom?.capacity === null || classroom === null ? '' : String(classroom.capacity),
      room: classroom?.room ?? '',
      homeroom_teacher_id: classroom?.homeroom_teacher?.id ?? '',
    },
  })

  const message = (field: keyof Values): string | undefined => {
    const error = errors[field]
    if (error?.message === undefined) return undefined
    if (error.type === 'server') return error.message
    switch (error.message) {
      case 'level':
      case 'section':
      case 'capacity':
        return t(`classes.sheet.errors.${error.message}`)
      default:
        return error.message
    }
  }

  const submit = handleSubmit(async (values) => {
    setFailed(false)
    try {
      const saved = await save.mutateAsync({
        id: classroom?.id ?? null,
        input: {
          level_id: values.level_id,
          section: values.section.trim(),
          capacity: values.capacity.trim() === '' ? null : Number(values.capacity.trim()),
          room: values.room.trim() === '' ? null : values.room.trim(),
          ...(teachers === null
            ? {}
            : {
                homeroom_teacher_id:
                  values.homeroom_teacher_id === '' ? null : values.homeroom_teacher_id,
              }),
        },
      })
      toast(
        classroom === null
          ? t('classes.sheet.created', { name: saved.name })
          : t('classes.sheet.saved', { name: saved.name }),
        { tone: 'success' },
      )
      onDone()
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        setFailed(true)
        return
      }
      for (const field of SERVER_FIELDS) {
        const text = error.fields[field]?.[0]
        if (text !== undefined) setError(field, { type: 'server', message: text })
      }
      const yearError = error.fields.academic_year_id?.[0]
      if (yearError !== undefined) setError('level_id', { type: 'server', message: yearError })
    }
  })

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="grid gap-1.5 border-b px-6 pt-6 pb-4 pr-16">
        <SheetTitle className="font-display text-xl font-bold">
          {classroom === null
            ? t('classes.sheet.createTitle')
            : t('classes.sheet.editTitle', { name: classroom.name })}
        </SheetTitle>
        <SheetDescription className="text-sm text-muted-foreground">
          {t('classes.sheet.description')}
        </SheetDescription>
      </div>
      <div className="grid flex-1 content-start gap-5 overflow-y-auto px-6 py-5">
        {failed && <FormAlert>{t('classes.sheet.failed')}</FormAlert>}
        <Field label={t('classes.sheet.level')} error={message('level_id')}>
          {(control) => (
            <NativeSelect {...control} {...register('level_id')}>
              <option value="">{t('classes.sheet.pickLevel')}</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {`${level.name} · ${level.cycleName}`}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={t('classes.sheet.section')}
            hint={t('classes.sheet.sectionHint')}
            error={message('section')}
          >
            {(control) => <Input {...control} {...register('section')} autoComplete="off" />}
          </Field>
          <Field
            label={t('classes.sheet.capacity')}
            hint={t('classes.sheet.optional')}
            error={message('capacity')}
          >
            {(control) => (
              <Input
                {...control}
                {...register('capacity')}
                inputMode="numeric"
                autoComplete="off"
              />
            )}
          </Field>
        </div>
        <Field
          label={t('classes.sheet.room')}
          hint={t('classes.sheet.optional')}
          error={message('room')}
        >
          {(control) => <Input {...control} {...register('room')} autoComplete="off" />}
        </Field>
        {teachers !== null && (
          <Field label={t('classes.sheet.teacher')} error={message('homeroom_teacher_id')}>
            {(control) => (
              <NativeSelect {...control} {...register('homeroom_teacher_id')}>
                <option value="">{t('classes.sheet.noTeacher')}</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t px-6 py-4">
        <Button type="button" variant="ghost" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="accent" disabled={isSubmitting}>
          <Save aria-hidden />
          {t('classes.sheet.save')}
        </Button>
      </div>
    </form>
  )
}
