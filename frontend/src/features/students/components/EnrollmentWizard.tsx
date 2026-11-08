import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Inbox,
  PartyPopper,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { MoneyAmount } from '@/components/MoneyAmount'
import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { useCurrentAcademicYear } from '@/features/academic/api'
import { can } from '@/features/auth/access'
import { FormAlert } from '@/features/auth/components/FormAlert'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { useBillingGrid } from '@/features/billing/api'
import { useClassroomList } from '@/features/classes/api'
import { ConflictError, ValidationError } from '@/lib/api/errors'
import { formatDay, formatPhone } from '@/lib/format'
import { normalizeCiPhone } from '@/lib/phone'
import { cn } from '@/lib/utils'

import {
  useEnrollStudent,
  usePreRegistration,
  usePreRegistrationsKey,
  type PreRegistration,
  type StudentFile,
} from '../api'
import {
  enrollmentPayload,
  enrollmentSchema,
  type EnrollmentValues,
  type GuardianValues,
} from '../enrollmentSchema'
import { useFieldMessage } from '../useFieldMessage'
import { GuardianFields, StudentFields } from './StudentFormFields'

const STEPS = ['schooling', 'student', 'guardians', 'review'] as const
const STEP_FIELDS: FieldPath<EnrollmentValues>[][] = [
  ['classroomId'],
  ['student'],
  ['guardians'],
  [],
]
const CONFLICTS = ['classroom_full', 'year_closed', 'already_decided'] as const

const EMPTY_GUARDIAN: GuardianValues = {
  name: '',
  relation: 'mother',
  phone: '',
  email: '',
  profession: '',
  isPayer: true,
  canPickUp: true,
}

const DEFAULTS: EnrollmentValues = {
  classroomId: '',
  student: {
    firstName: '',
    lastName: '',
    gender: 'F',
    birthDate: '',
    birthPlace: '',
    address: '',
    bloodType: '',
    allergies: '',
    medicalNotes: '',
  },
  guardians: [EMPTY_GUARDIAN],
  options: [],
}

/** Champ du formulaire correspondant à une clé d'erreur Laravel (`student.first_name`, `guardians.0.phone`). */
function formField(key: string): FieldPath<EnrollmentValues> | null {
  if (key === 'classroom_id') return 'classroomId'
  const student = /^student\.(\w+)$/.exec(key)?.[1]
  const studentFields: Record<string, keyof EnrollmentValues['student']> = {
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
  const mapped = student === undefined ? undefined : studentFields[student]
  if (mapped !== undefined) return `student.${mapped}`
  const guardian = /^guardians\.(\d+)\.(name|phone|email|profession|relation)$/.exec(key)
  if (guardian?.[1] !== undefined && guardian[2] !== undefined) {
    const name = guardian[2]
    if (
      name === 'name' ||
      name === 'phone' ||
      name === 'email' ||
      name === 'profession' ||
      name === 'relation'
    )
      return `guardians.${Number(guardian[1])}.${name}`
  }
  return key === 'guardians' ? 'guardians' : null
}

/** Valeurs de départ : vides, ou reprises d'une pré-inscription (enfant et parent ; la classe reste à choisir). */
function initialValues(preRegistration: PreRegistration | null): EnrollmentValues {
  if (preRegistration === null) return DEFAULTS
  return {
    ...DEFAULTS,
    student: {
      ...DEFAULTS.student,
      firstName: preRegistration.child.first_name,
      lastName: preRegistration.child.last_name,
      gender: preRegistration.child.gender,
      birthDate: preRegistration.child.birth_date,
    },
    guardians: [
      {
        ...EMPTY_GUARDIAN,
        name: preRegistration.guardian.name,
        phone: preRegistration.guardian.phone,
        email: preRegistration.guardian.email ?? '',
      },
    ],
  }
}

/**
 * Assistant d'inscription (vraie API) : classe, élève, parents, vérification ; matricule attribué par l'école.
 * Avec `preRegistrationId`, il reprend une pré-inscription reçue en ligne, qui passe « inscrite » à l'envoi.
 */
export function EnrollmentWizard({
  preRegistrationId = null,
}: {
  preRegistrationId?: string | null
}) {
  const { t } = useTranslation()
  const query = usePreRegistration(preRegistrationId)
  if (preRegistrationId === null) return <EnrollmentForm preRegistration={null} />
  return (
    <QueryState query={query}>
      {(preRegistration) =>
        preRegistration?.status !== 'pending' ? (
          <div className="grid gap-6">
            <ScreenHeader title={t('enrollment.title')} />
            <EmptyState
              illustration="lost"
              title={
                preRegistration === null
                  ? t('enrollment.preRegistrationNotFound')
                  : t('enrollment.preRegistrationDecided')
              }
              action={
                <Button asChild>
                  <Link from="/$school" to="/$school/pre-inscriptions">
                    {t('enrollment.backToPreRegistrations')}
                  </Link>
                </Button>
              }
            />
          </div>
        ) : (
          <EnrollmentForm key={preRegistration.id} preRegistration={preRegistration} />
        )
      }
    </QueryState>
  )
}

function EnrollmentForm({ preRegistration }: { preRegistration: PreRegistration | null }) {
  const { t } = useTranslation()
  const message = useFieldMessage()
  const school = useCurrentSchool()
  const year = useCurrentAcademicYear()
  const classrooms = useClassroomList()
  const grid = useBillingGrid(can(school, 'billing.view'))
  const enroll = useEnrollStudent()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { key: preRegistrationsKey } = usePreRegistrationsKey()
  const [step, setStep] = useState(0)
  const [created, setCreated] = useState<StudentFile | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const form = useForm<EnrollmentValues>({
    resolver: zodResolver(enrollmentSchema),
    // Validation au clic sur « Suivant » seulement : revalider à la sortie d'un champ ferait disparaître le message
    // pendant le clic, le bouton remonterait sous le pointeur et le clic serait perdu
    mode: 'onSubmit',
    defaultValues: initialValues(preRegistration),
  })
  const { register, control, formState, setValue, setError, trigger, handleSubmit, reset } = form
  const guardians = useFieldArray({ control, name: 'guardians' })
  const values = useWatch({ control })

  const classroom = (classrooms.data ?? []).find((candidate) => candidate.id === values.classroomId)
  const manageScope = school?.permissions['students.manage']
  const medicalScope = school?.permissions['students.medical.view']
  const medical =
    classroom !== undefined &&
    medicalScope !== undefined &&
    (medicalScope === null || medicalScope.includes(classroom.level.cycle_id))
  // Services optionnels du niveau de la classe choisie, avec leur montant annuel dans la grille
  const gridLevel = grid.data?.cycles
    .flatMap((cycle) => cycle.levels)
    .find((level) => level.id === classroom?.level.id)
  const services = (grid.data?.fee_types ?? [])
    .filter((type) => type.is_optional)
    .map((type) => ({
      type,
      amount: gridLevel?.amounts.find((entry) => entry.fee_type_id === type.id)?.amount ?? 0,
    }))
    .filter((service) => service.amount > 0)
  const choices = (classrooms.data ?? []).filter(
    (candidate) =>
      manageScope !== undefined &&
      (manageScope === null || manageScope.includes(candidate.level.cycle_id)),
  )

  const next = async () => {
    const fields = STEP_FIELDS[step] ?? []
    if (fields.length > 0 && !(await trigger(fields, { shouldFocus: true }))) return
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  const submit = handleSubmit(async (data) => {
    setFailure(null)
    try {
      setCreated(
        await enroll.mutateAsync({
          ...enrollmentPayload(data, medical),
          ...(preRegistration === null ? {} : { pre_registration_id: preRegistration.id }),
        }),
      )
      // La liste seulement : relire cette pré-inscription (« inscrite ») remplacerait l'écran de réussite
      if (preRegistration !== null)
        await queryClient.invalidateQueries({ queryKey: [...preRegistrationsKey, 'list'] })
    } catch (error) {
      if (error instanceof ConflictError) {
        const code = CONFLICTS.find((candidate) => candidate === error.code)
        setFailure(code === undefined ? error.message : t(`enrollment.conflicts.${code}`))
        setStep(0)
        return
      }
      if (!(error instanceof ValidationError)) {
        setFailure(t('enrollment.failed'))
        return
      }
      let first: number | null = null
      for (const [key, messages] of Object.entries(error.fields)) {
        const field = formField(key)
        const text = messages[0]
        if (field === null || text === undefined) continue
        setError(field, { type: 'server', message: text })
        const target = field === 'classroomId' ? 0 : field.startsWith('student') ? 1 : 2
        first = first === null ? target : Math.min(first, target)
      }
      if (first !== null) setStep(first)
    }
  })

  if (created !== null) {
    const enrollment = created.enrollments[0]
    return (
      <div className="grid gap-6">
        <ScreenHeader title={t('enrollment.title')} />
        <EmptyState
          illustration="empty"
          title={
            <span className="inline-flex items-center gap-2">
              <PartyPopper aria-hidden className="size-5 text-accent-ink" />
              {t('enrollment.successTitle', { name: created.full_name })}
            </span>
          }
          description={t('enrollment.successDescription', {
            matricule: created.matricule,
            classroom: enrollment?.classroom.name ?? '',
          })}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="accent">
                <Link
                  from="/$school"
                  to="/$school/eleves/$studentId"
                  params={{ studentId: created.id }}
                >
                  {t('enrollment.openFile')}
                </Link>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (preRegistration !== null) {
                    void navigate({ to: '/$school/inscriptions', from: '/$school', search: {} })
                    return
                  }
                  reset(DEFAULTS)
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

  if (year === null) {
    return (
      <div className="grid gap-6">
        <ScreenHeader title={t('enrollment.title')} />
        <EmptyState title={t('classes.noYearTitle')} description={t('classes.noYearDescription')} />
      </div>
    )
  }

  const guardianErrors = formState.errors.guardians
  const payerError = message(guardianErrors?.root?.message ?? guardianErrors?.message)

  return (
    <div className="grid gap-6">
      <ScreenHeader title={t('enrollment.title')} description={t('enrollment.description')} />

      <ol
        className="grid grid-cols-4 gap-2"
        aria-label={t('enrollment.stepOf', { current: step + 1, total: STEPS.length })}
      >
        {STEPS.map((name, index) => (
          <li key={name} aria-current={index === step ? 'step' : undefined} className="grid gap-2">
            <span
              className={cn(
                'h-1.5 rounded-full transition-colors',
                index < step ? 'bg-success' : index === step ? 'bg-accent' : 'bg-muted',
              )}
            />
            <span
              className={cn(
                'flex items-center gap-1.5 text-xs font-semibold sm:text-sm',
                index === step ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
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
              {t(`enrollment.steps.${STEPS[step] ?? 'schooling'}`)}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {t('enrollment.stepOf', { current: step + 1, total: STEPS.length })}
              </span>
            </h2>
            {failure !== null && <FormAlert>{failure}</FormAlert>}
            {preRegistration !== null && step === 0 && (
              <div className="flex items-start gap-3 rounded-xl bg-orange-100/60 p-3 text-sm dark:bg-orange/10">
                <Inbox aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-ink" />
                <p>
                  {t('enrollment.fromPreRegistration', {
                    reference: preRegistration.reference,
                    level: preRegistration.level.name,
                    cycle: preRegistration.level.cycle_name,
                  })}
                  {preRegistration.message !== null && (
                    <span className="mt-1 block text-muted-foreground">
                      « {preRegistration.message} »
                    </span>
                  )}
                </p>
              </div>
            )}

            {step === 0 && (
              <Field
                label={t('enrollment.classroom')}
                hint={year === undefined ? undefined : t('enrollment.year', { year: year.label })}
                error={message(formState.errors.classroomId?.message)}
              >
                {(c) => (
                  <NativeSelect {...c} {...register('classroomId')}>
                    <option value="">{t('enrollment.chooseClassroom')}</option>
                    {choices.map((candidate) => {
                      const free =
                        candidate.capacity === null
                          ? null
                          : Math.max(0, candidate.capacity - candidate.enrolled_count)
                      return (
                        <option key={candidate.id} value={candidate.id} disabled={free === 0}>
                          {free === null
                            ? `${candidate.name} — ${t('enrollment.enrolled', { count: candidate.enrolled_count })}`
                            : `${candidate.name} — ${t('enrollment.seats', { count: free })}`}
                        </option>
                      )
                    })}
                  </NativeSelect>
                )}
              </Field>
            )}
            {step === 0 && services.length > 0 && (
              <fieldset className="grid gap-3">
                <legend className="mb-2 font-semibold">{t('enrollment.services')}</legend>
                {services.map(({ type, amount }) => {
                  const checked = (values.options ?? []).includes(type.code)
                  return (
                    <label
                      key={type.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 has-[:checked]:border-accent"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(state) => {
                          const current = form.getValues('options')
                          setValue(
                            'options',
                            state === true
                              ? [...current, type.code]
                              : current.filter((code) => code !== type.code),
                          )
                        }}
                      />
                      <span className="flex-1 font-medium">{type.name}</span>
                      <span className="text-sm text-muted-foreground">
                        <MoneyAmount value={amount} />
                        {` ${t('enrollment.perYear')}`}
                      </span>
                    </label>
                  )
                })}
              </fieldset>
            )}

            {step === 1 && (
              <StudentFields
                field={(name) => register(`student.${name}`)}
                errors={formState.errors.student}
                medical={medical}
              />
            )}

            {step === 2 && (
              <div className="grid gap-6">
                <p className="text-sm text-muted-foreground">{t('enrollment.guardiansHint')}</p>
                {guardians.fields.map((field, index) => (
                  <fieldset
                    key={field.id}
                    className="grid gap-4 rounded-2xl border p-4 md:grid-cols-2"
                  >
                    <legend className="px-1 font-semibold">
                      {t('enrollment.guardian', { index: index + 1 })}
                    </legend>
                    <GuardianFields
                      field={(name) => register(`guardians.${index}.${name}`)}
                      errors={guardianErrors?.[index]}
                    />
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:col-span-2">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`payer-${field.id}`}
                          checked={values.guardians?.[index]?.isPayer ?? false}
                          onCheckedChange={(checked) => {
                            // Un seul payeur : cocher l'un décoche les autres
                            guardians.fields.forEach((_, other) => {
                              setValue(
                                `guardians.${other}.isPayer`,
                                checked === true && other === index,
                                { shouldValidate: true },
                              )
                            })
                          }}
                        />
                        <Label htmlFor={`payer-${field.id}`}>{t('enrollment.payer')}</Label>
                      </div>
                      <Controller
                        control={control}
                        name={`guardians.${index}.canPickUp`}
                        render={({ field: pickUp }) => (
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`pickup-${field.id}`}
                              checked={pickUp.value}
                              onCheckedChange={(checked) => {
                                pickUp.onChange(checked === true)
                              }}
                            />
                            <Label htmlFor={`pickup-${field.id}`}>
                              {t('enrollment.canPickUp')}
                            </Label>
                          </div>
                        )}
                      />
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-auto"
                          onClick={() => {
                            const wasPayer = form.getValues(`guardians.${index}.isPayer`)
                            guardians.remove(index)
                            if (wasPayer) setValue('guardians.0.isPayer', true)
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
                {guardians.fields.length < 4 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-self-start"
                    onClick={() => {
                      guardians.append({ ...EMPTY_GUARDIAN, relation: 'father', isPayer: false })
                    }}
                  >
                    <Plus aria-hidden />
                    {t('enrollment.addGuardian')}
                  </Button>
                )}
              </div>
            )}

            {step === 3 && (
              <dl className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-1 rounded-2xl bg-muted/60 p-4">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase">
                    {t('enrollment.summaryStudent')}
                  </dt>
                  <dd className="font-semibold">
                    {values.student?.lastName} {values.student?.firstName}
                  </dd>
                  <dd className="text-sm">
                    {t(`students.detail.genders.${values.student?.gender ?? 'F'}`)}
                    {values.student?.birthDate ? ` · ${formatDay(values.student.birthDate)}` : ''}
                  </dd>
                  <dd className="text-sm text-muted-foreground">{values.student?.address}</dd>
                </div>
                <div className="grid gap-1 rounded-2xl bg-muted/60 p-4">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase">
                    {t('enrollment.summaryGuardians')}
                  </dt>
                  {(values.guardians ?? []).map((guardian, index) => (
                    <dd key={index} className="text-sm">
                      <span className="font-semibold">{guardian.name}</span>
                      {` (${t(`enrollment.relations.${guardian.relation ?? 'other'}`)}) · ${formatPhone(normalizeCiPhone(guardian.phone ?? '') ?? guardian.phone ?? '')}`}
                      {guardian.isPayer === true && ` · ${t('students.detail.payerBadge')}`}
                    </dd>
                  ))}
                </div>
                <div className="grid gap-1 rounded-2xl bg-muted/60 p-4">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase">
                    {t('enrollment.summarySchooling')}
                  </dt>
                  {classroom !== undefined && (
                    <dd>
                      <CycleBadge
                        code={classroom.level.cycle_code}
                        label={classroom.name}
                        className="w-fit"
                      />
                    </dd>
                  )}
                  <dd className="text-sm text-muted-foreground">{t('enrollment.matriculeHint')}</dd>
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
