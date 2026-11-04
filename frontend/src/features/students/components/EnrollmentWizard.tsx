import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check, PartyPopper, Plus, Trash2, UserPlus, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useFieldArray, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod/mini'

import { CycleBadge } from '@/components/CycleBadge'
import { MoneyAmount } from '@/components/MoneyAmount'
import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useFees } from '@/features/billing/api'
import { useClassrooms } from '@/features/classes/api'
import { formatDay, formatPhone } from '@/lib/format'
import { normalizeCiPhone } from '@/lib/phone'
import type { DemoStudent, FeeKind } from '@/lib/demo/types'
import { cn } from '@/lib/utils'

import { useEnroll } from '../api'

const RELATIONS = ['Père', 'Mère', 'Tuteur', 'Tutrice'] as const
const OPTIONAL: FeeKind[] = ['canteen', 'transport', 'daycare']
const ERROR_CODES = ['required', 'birthDate', 'phone', 'classroom', 'payer'] as const
type ErrorCode = (typeof ERROR_CODES)[number]

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
  guardians: z
    .array(guardianSchema)
    .check(z.minLength(1, 'required'), z.refine((list) => list.some((guardian) => guardian.isPayer), 'payer')),
  classroomId: z.string().check(z.minLength(1, 'classroom')),
  options: z.array(z.enum(['registration', 'tuition', 'canteen', 'transport', 'daycare'])),
})

export type EnrollmentValues = z.infer<typeof enrollmentSchema>

const STEPS = ['student', 'guardians', 'schooling', 'review'] as const
const STEP_FIELDS: FieldPath<EnrollmentValues>[][] = [
  ['firstName', 'lastName', 'gender', 'birthDate', 'district', 'medicalNote'],
  ['guardians'],
  ['classroomId', 'options'],
  [],
]

const EMPTY_GUARDIAN = { name: '', relation: 'Mère' as const, phone: '', profession: '', isPayer: true }

function isCode(value: string | undefined): value is ErrorCode {
  return ERROR_CODES.some((code) => code === value)
}

/** Assistant d'inscription pas à pas. */
export function EnrollmentWizard() {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [created, setCreated] = useState<DemoStudent | null>(null)
  const enroll = useEnroll()
  const classrooms = useClassrooms()
  const fees = useFees()

  const form = useForm<EnrollmentValues>({
    resolver: zodResolver(enrollmentSchema),
    mode: 'onTouched',
    defaultValues: {
      firstName: '',
      lastName: '',
      gender: 'F',
      birthDate: '',
      district: '',
      medicalNote: '',
      guardians: [EMPTY_GUARDIAN],
      classroomId: '',
      options: [],
    },
  })
  const { register, control, formState, setValue, trigger, handleSubmit, reset } = form
  const guardians = useFieldArray({ control, name: 'guardians' })
  const values = useWatch({ control })

  const message = (code: string | undefined): string | undefined =>
    code === undefined ? undefined : isCode(code) ? t(`enrollment.errors.${code}`) : code

  const allClassrooms = (classrooms.data ?? []).flatMap((group) => group.classrooms)
  const classroom = allClassrooms.find((candidate) => candidate.id === values.classroomId)
  const levelFees = (fees.data?.fees ?? []).filter((fee) => fee.levelCode === classroom?.levelCode)
  const annual = levelFees
    .filter((fee) => !fee.optional || (values.options ?? []).includes(fee.kind))
    .reduce((sum, fee) => sum + fee.amount, 0)

  const next = async () => {
    const fields = STEP_FIELDS[step] ?? []
    if (fields.length > 0 && !(await trigger(fields, { shouldFocus: true }))) return
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  const submit = handleSubmit(async (data) => {
    const student = await enroll.mutateAsync({
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      birthDate: data.birthDate,
      district: data.district,
      medicalNote: data.medicalNote.trim() === '' ? null : data.medicalNote.trim(),
      classroomId: data.classroomId,
      options: data.options,
      guardians: data.guardians.map((guardian) => ({
        ...guardian,
        name: guardian.name.trim(),
        phone: normalizeCiPhone(guardian.phone) ?? guardian.phone,
      })),
    })
    setCreated(student)
  })

  if (created !== null) {
    return (
      <div className="grid gap-6">
        <ScreenHeader title={t('enrollment.title')} />
        <EmptyState
          illustration="empty"
          title={
            <span className="inline-flex items-center gap-2">
              <PartyPopper aria-hidden className="size-5 text-accent-ink" />
              {t('enrollment.successTitle', { name: `${created.firstName} ${created.lastName}` })}
            </span>
          }
          description={t('enrollment.successDescription', { matricule: created.matricule })}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="accent">
                <Link to="/gestion/encaissements" search={{ eleve: created.id }}>
                  <Wallet aria-hidden />
                  {t('enrollment.collectRegistration')}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/gestion/eleves/$studentId" params={{ studentId: created.id }}>
                  {t('enrollment.openFile')}
                </Link>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  reset()
                  setStep(0)
                  setCreated(null)
                }}
              >
                <UserPlus aria-hidden />
                {t('enrollment.another')}
              </Button>
            </div>
          }
        />
      </div>
    )
  }

  const guardianErrors = formState.errors.guardians
  const payerError = message(guardianErrors?.root?.message ?? guardianErrors?.message)

  return (
    <div className="grid gap-6">
      <ScreenHeader title={t('enrollment.title')} description={t('enrollment.description')} />

      <ol className="grid grid-cols-4 gap-2" aria-label={t('enrollment.stepOf', { current: step + 1, total: STEPS.length })}>
        {STEPS.map((name, index) => (
          <li key={name} aria-current={index === step ? 'step' : undefined} className="grid gap-2">
            <span
              className={cn(
                'h-1.5 rounded-full transition-colors',
                index < step ? 'bg-success' : index === step ? 'bg-accent' : 'bg-muted',
              )}
            />
            <span className={cn('flex items-center gap-1.5 text-xs font-semibold sm:text-sm', index === step ? 'text-foreground' : 'text-muted-foreground')}>
              {index < step && <Check aria-hidden className="size-4 text-success-ink" />}
              <span className="hidden sm:inline">{t(`enrollment.steps.${name}`)}</span>
              <span className="sm:hidden">{String(index + 1)}</span>
            </span>
          </li>
        ))}
      </ol>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (step === STEPS.length - 1) void submit(event)
          else void next()
        }}
      >
        <Card>
          <CardContent className="grid gap-5 pt-6">
            <h2 className="font-display text-xl font-semibold">
              {t(`enrollment.steps.${STEPS[step] ?? 'student'}`)}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {t('enrollment.stepOf', { current: step + 1, total: STEPS.length })}
              </span>
            </h2>

            {step === 0 && (
              <div className="grid gap-5 md:grid-cols-2">
                <Field label={t('enrollment.lastName')} error={message(formState.errors.lastName?.message)}>
                  {(c) => <Input {...c} {...register('lastName')} autoComplete="off" />}
                </Field>
                <Field label={t('enrollment.firstName')} error={message(formState.errors.firstName?.message)}>
                  {(c) => <Input {...c} {...register('firstName')} autoComplete="off" />}
                </Field>
                <Field label={t('enrollment.gender')}>
                  {(c) => (
                    <NativeSelect {...c} {...register('gender')}>
                      <option value="F">{t('students.detail.genders.F')}</option>
                      <option value="M">{t('students.detail.genders.M')}</option>
                    </NativeSelect>
                  )}
                </Field>
                <Field label={t('enrollment.birthDate')} error={message(formState.errors.birthDate?.message)}>
                  {(c) => <Input {...c} type="date" {...register('birthDate')} />}
                </Field>
                <Field label={t('enrollment.district')} error={message(formState.errors.district?.message)} className="md:col-span-2">
                  {(c) => <Input {...c} {...register('district')} placeholder={t('enrollment.districtPlaceholder')} />}
                </Field>
                <Field label={t('enrollment.medical')} hint={t('enrollment.medicalHint')} className="md:col-span-2">
                  {(c) => <Textarea {...c} rows={2} {...register('medicalNote')} />}
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-6">
                {guardians.fields.map((field, index) => (
                  <fieldset key={field.id} className="grid gap-4 rounded-2xl border p-4 md:grid-cols-2">
                    <legend className="px-1 font-semibold">{t('enrollment.guardian', { index: index + 1 })}</legend>
                    <Field label={t('enrollment.guardianName')} error={message(guardianErrors?.[index]?.name?.message)}>
                      {(c) => <Input {...c} {...register(`guardians.${index}.name`)} autoComplete="off" />}
                    </Field>
                    <Field label={t('enrollment.relation')}>
                      {(c) => (
                        <NativeSelect {...c} {...register(`guardians.${index}.relation`)}>
                          {RELATIONS.map((relation) => (
                            <option key={relation} value={relation}>
                              {t(`enrollment.relations.${relation}`)}
                            </option>
                          ))}
                        </NativeSelect>
                      )}
                    </Field>
                    <Field label={t('enrollment.phone')} hint={t('enrollment.phoneHint')} error={message(guardianErrors?.[index]?.phone?.message)}>
                      {(c) => <Input {...c} {...register(`guardians.${index}.phone`)} type="tel" inputMode="tel" autoComplete="off" />}
                    </Field>
                    <Field label={t('enrollment.profession')}>{(c) => <Input {...c} {...register(`guardians.${index}.profession`)} />}</Field>
                    <div className="flex items-center gap-3 md:col-span-2">
                      <Checkbox
                        id={`payer-${field.id}`}
                        checked={values.guardians?.[index]?.isPayer ?? false}
                        onCheckedChange={(checked) => {
                          // Un seul payeur : cocher l'un décoche les autres
                          guardians.fields.forEach((_, other) => {
                            setValue(`guardians.${other}.isPayer`, checked === true && other === index, { shouldValidate: true })
                          })
                        }}
                      />
                      <Label htmlFor={`payer-${field.id}`}>{t('enrollment.payer')}</Label>
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-auto"
                          onClick={() => {
                            guardians.remove(index)
                          }}
                        >
                          <Trash2 aria-hidden />
                          {t('enrollment.removeGuardian')}
                        </Button>
                      )}
                    </div>
                  </fieldset>
                ))}
                {payerError !== undefined && (
                  <p role="alert" className="text-sm font-medium text-destructive-ink">
                    {payerError}
                  </p>
                )}
                {guardians.fields.length < 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-self-start"
                    onClick={() => {
                      guardians.append({ ...EMPTY_GUARDIAN, relation: 'Père', isPayer: false })
                    }}
                  >
                    <Plus aria-hidden />
                    {t('enrollment.addGuardian')}
                  </Button>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-5">
                <Field label={t('enrollment.classroom')} error={message(formState.errors.classroomId?.message)}>
                  {(c) => (
                    <NativeSelect {...c} {...register('classroomId')}>
                      <option value="">{t('enrollment.chooseClassroom')}</option>
                      {(classrooms.data ?? []).map((group) => (
                        <optgroup key={group.level.code} label={group.level.name}>
                          {group.classrooms.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {`${candidate.name} — ${t('enrollment.seats', { count: Math.max(0, candidate.capacity - candidate.students) })}`}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </NativeSelect>
                  )}
                </Field>
                {classroom !== undefined && (
                  <fieldset className="grid gap-3">
                    <legend className="mb-2 font-semibold">{t('enrollment.services')}</legend>
                    {OPTIONAL.filter((kind) => levelFees.some((fee) => fee.kind === kind)).map((kind) => {
                      const fee = levelFees.find((candidate) => candidate.kind === kind)
                      const checked = (values.options ?? []).includes(kind)
                      return (
                        <label key={kind} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 has-[:checked]:border-accent">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(state) => {
                              const current = form.getValues('options')
                              setValue('options', state === true ? [...current, kind] : current.filter((option) => option !== kind))
                            }}
                          />
                          <span className="flex-1 font-medium">{t(`fees.kinds.${kind}`)}</span>
                          <span className="text-sm text-muted-foreground">
                            {t('enrollment.perYear', { amount: '' })}
                            <MoneyAmount value={fee?.amount ?? 0} />
                          </span>
                        </label>
                      )
                    })}
                  </fieldset>
                )}
                {classroom !== undefined && (
                  <p className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
                    <span className="font-semibold">{t('enrollment.annual')}</span>
                    <MoneyAmount value={annual} className="font-display text-xl font-bold" />
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <dl className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-1 rounded-2xl bg-muted/60 p-4">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase">{t('enrollment.summaryStudent')}</dt>
                  <dd className="font-semibold">
                    {values.lastName} {values.firstName}
                  </dd>
                  <dd className="text-sm">
                    {t(`students.detail.genders.${values.gender ?? 'F'}`)} · {values.birthDate ? formatDay(values.birthDate) : ''}
                  </dd>
                  <dd className="text-sm text-muted-foreground">{values.district}</dd>
                </div>
                <div className="grid gap-1 rounded-2xl bg-muted/60 p-4">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase">{t('enrollment.summaryGuardians')}</dt>
                  {(values.guardians ?? []).map((guardian, index) => (
                    <dd key={index} className="text-sm">
                      <span className="font-semibold">{guardian.name}</span> ({guardian.relation}) ·{' '}
                      {formatPhone(normalizeCiPhone(guardian.phone ?? '') ?? guardian.phone ?? '')}
                    </dd>
                  ))}
                </div>
                <div className="grid gap-1 rounded-2xl bg-muted/60 p-4">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase">{t('enrollment.summarySchooling')}</dt>
                  {classroom !== undefined && <CycleBadge code={classroom.cycle} label={classroom.name} className="w-fit" />}
                  <dd className="text-sm">{(values.options ?? []).map((option) => t(`fees.kinds.${option}`)).join(', ')}</dd>
                  <dd className="font-display text-lg font-bold">
                    <MoneyAmount value={annual} />
                  </dd>
                </div>
              </dl>
            )}

            <div className="flex items-center justify-between gap-3 border-t pt-5">
              <Button
                type="button"
                variant="ghost"
                disabled={step === 0}
                onClick={() => {
                  setStep((current) => Math.max(0, current - 1))
                }}
              >
                <ArrowLeft aria-hidden />
                {t('common.previous')}
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="submit">
                  {t('common.next')}
                  <ArrowRight aria-hidden />
                </Button>
              ) : (
                <Button type="submit" variant="accent" disabled={enroll.isPending}>
                  <Check aria-hidden />
                  {t(enroll.isPending ? 'enrollment.submitting' : 'enrollment.submit')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
