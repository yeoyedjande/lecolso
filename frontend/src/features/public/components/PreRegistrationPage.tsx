import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, Send } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod/mini'

import { Logo } from '@/components/brand/Logo'
import { DemoBanner } from '@/components/states/DemoBanner'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { formatPhone } from '@/lib/format'
import { normalizeCiPhone } from '@/lib/phone'

import { usePreRegister, usePublicSchool } from '../api'
import type { PreRegistration } from '../demo'

const CODES = ['required', 'birthDate', 'phone', 'email', 'consent'] as const

const schema = z.object({
  childFirstName: z.string().check(z.trim(), z.minLength(1, 'required')),
  childLastName: z.string().check(z.trim(), z.minLength(1, 'required')),
  birthDate: z.string().check(z.regex(/^20\d{2}-\d{2}-\d{2}$/, 'birthDate')),
  level: z.string().check(z.minLength(1, 'required')),
  guardianName: z.string().check(z.trim(), z.minLength(3, 'required')),
  guardianPhone: z.string().check(z.refine((value) => normalizeCiPhone(value) !== null, 'phone')),
  guardianEmail: z
    .string()
    .check(
      z.refine(
        (value) => value.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
        'email',
      ),
    ),
  message: z.string(),
  consent: z.boolean().check(z.refine((value) => value, 'consent')),
})

type Values = z.infer<typeof schema>

/** Pré-inscription en ligne depuis la page publique (démonstration : rien n'est envoyé au serveur). */
export function PreRegistrationPage({ slug }: { slug: string }) {
  const { t } = useTranslation()
  const school = usePublicSchool(slug)
  const submitRequest = usePreRegister(slug)
  const [done, setDone] = useState<PreRegistration | null>(null)
  const { register, handleSubmit, control, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      childFirstName: '',
      childLastName: '',
      birthDate: '',
      level: '',
      guardianName: '',
      guardianPhone: '',
      guardianEmail: '',
      message: '',
      consent: false,
    },
  })

  const message = (value: string | undefined): string | undefined => {
    if (value === undefined) return undefined
    const code = CODES.find((candidate) => candidate === value)
    return code === undefined ? value : t(`publicSchool.pre.errors.${code}`)
  }

  const submit = handleSubmit(async (values) => {
    const created = await submitRequest.mutateAsync({
      childFirstName: values.childFirstName.trim(),
      childLastName: values.childLastName.trim(),
      birthDate: values.birthDate,
      level: values.level,
      guardianName: values.guardianName.trim(),
      guardianPhone: normalizeCiPhone(values.guardianPhone) ?? values.guardianPhone,
      guardianEmail: values.guardianEmail.trim() === '' ? null : values.guardianEmail.trim(),
      message: values.message.trim(),
    })
    setDone(created)
  })

  return (
    <main id="contenu" className="mx-auto grid min-h-dvh max-w-2xl content-start gap-6 px-5 py-8">
      <div className="flex items-center justify-between gap-3">
        <Logo />
        <Button asChild variant="ghost" size="sm">
          <Link to="/$school" params={{ school: slug }}>
            <ArrowLeft aria-hidden />
            {t('publicSchool.pre.back')}
          </Link>
        </Button>
      </div>
      <QueryState query={school}>
        {(data) =>
          data === null ? (
            <EmptyState headingLevel={1} illustration="lost" title={t('publicSchool.notFound')} />
          ) : done !== null ? (
            <EmptyState
              headingLevel={1}
              title={
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 aria-hidden className="size-6 text-success-ink" />
                  {t('publicSchool.pre.doneTitle')}
                </span>
              }
              description={t('publicSchool.pre.doneDescription', {
                reference: done.reference,
                phone: formatPhone(done.guardianPhone),
              })}
              action={
                <Button asChild>
                  <Link to="/$school" params={{ school: slug }}>
                    {t('publicSchool.pre.back')}
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-5">
              <div className="grid gap-2">
                <DemoBanner />
                <h1 className="font-display text-3xl font-bold">{t('publicSchool.pre.title')}</h1>
                <p className="text-muted-foreground">
                  {data.name} — {t('publicSchool.pre.description')}
                </p>
              </div>
              <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-5">
                <Card>
                  <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                    <h2 className="font-display text-lg font-semibold sm:col-span-2">
                      {t('publicSchool.pre.child')}
                    </h2>
                    <Field
                      label={t('publicSchool.pre.lastName')}
                      error={message(formState.errors.childLastName?.message)}
                    >
                      {(c) => <Input {...c} {...register('childLastName')} autoComplete="off" />}
                    </Field>
                    <Field
                      label={t('publicSchool.pre.firstName')}
                      error={message(formState.errors.childFirstName?.message)}
                    >
                      {(c) => <Input {...c} {...register('childFirstName')} autoComplete="off" />}
                    </Field>
                    <Field
                      label={t('publicSchool.pre.birthDate')}
                      error={message(formState.errors.birthDate?.message)}
                    >
                      {(c) => <Input {...c} type="date" {...register('birthDate')} />}
                    </Field>
                    <Field
                      label={t('publicSchool.pre.level')}
                      error={message(formState.errors.level?.message)}
                    >
                      {(c) => (
                        <NativeSelect {...c} {...register('level')}>
                          <option value="">{t('publicSchool.pre.chooseLevel')}</option>
                          {data.cycles.map((cycle) => (
                            <optgroup key={cycle.code} label={cycle.name}>
                              {cycle.levels.map((level) => (
                                <option key={level} value={level}>
                                  {level}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </NativeSelect>
                      )}
                    </Field>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                    <h2 className="font-display text-lg font-semibold sm:col-span-2">
                      {t('publicSchool.pre.guardian')}
                    </h2>
                    <Field
                      label={t('publicSchool.pre.guardianName')}
                      error={message(formState.errors.guardianName?.message)}
                      className="sm:col-span-2"
                    >
                      {(c) => <Input {...c} {...register('guardianName')} autoComplete="name" />}
                    </Field>
                    <Field
                      label={t('publicSchool.pre.phone')}
                      error={message(formState.errors.guardianPhone?.message)}
                    >
                      {(c) => (
                        <Input
                          {...c}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          {...register('guardianPhone')}
                        />
                      )}
                    </Field>
                    <Field
                      label={t('publicSchool.pre.email')}
                      error={message(formState.errors.guardianEmail?.message)}
                    >
                      {(c) => (
                        <Input
                          {...c}
                          type="email"
                          autoComplete="email"
                          {...register('guardianEmail')}
                        />
                      )}
                    </Field>
                    <Field label={t('publicSchool.pre.message')} className="sm:col-span-2">
                      {(c) => <Textarea {...c} rows={3} {...register('message')} />}
                    </Field>
                    <Controller
                      control={control}
                      name="consent"
                      render={({ field, fieldState }) => (
                        <div className="grid gap-1 sm:col-span-2">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id="consent"
                              checked={field.value}
                              aria-invalid={fieldState.error !== undefined}
                              onCheckedChange={(checked) => {
                                field.onChange(checked === true)
                              }}
                            />
                            <Label htmlFor="consent">{t('publicSchool.pre.consent')}</Label>
                          </div>
                          {fieldState.error !== undefined && (
                            <p
                              role="alert"
                              className="text-[13px] font-medium text-destructive-ink"
                            >
                              {message(fieldState.error.message)}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </CardContent>
                </Card>
                <Button type="submit" variant="accent" size="lg" disabled={submitRequest.isPending}>
                  <Send aria-hidden />
                  {t('publicSchool.pre.submit')}
                </Button>
              </form>
            </div>
          )
        }
      </QueryState>
    </main>
  )
}
