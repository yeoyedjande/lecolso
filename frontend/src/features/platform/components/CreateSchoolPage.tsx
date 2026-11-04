import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Building2, CheckCircle2, Copy, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod/mini'

import { ScreenHeader } from '@/components/ScreenHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ValidationError } from '@/lib/api/errors'
import { env } from '@/lib/env'
import { formatPhone } from '@/lib/format'
import { normalizeCiPhone } from '@/lib/phone'
import { toast } from '@/lib/toast'

import { useCreateSchool, type CreateSchoolInput } from '../api'
import { SLUG_PATTERN, slugify } from '../slug'

const CYCLES = ['daycare', 'kindergarten', 'primary'] as const
const CODES = ['required', 'slug', 'phone', 'cycles'] as const

const schema = z.object({
  name: z.string().check(z.trim(), z.minLength(3, 'required')),
  slug: z.string().check(z.minLength(3, 'slug'), z.regex(SLUG_PATTERN, 'slug')),
  city: z.string(),
  cycles: z.array(z.enum(CYCLES)).check(z.minLength(1, 'cycles')),
  directorName: z.string().check(z.trim(), z.minLength(3, 'required')),
  directorPhone: z.string().check(z.refine((value) => normalizeCiPhone(value) !== null, 'phone')),
  directorEmail: z.string(),
})

type Values = z.infer<typeof schema>

/** Champs du formulaire correspondant aux erreurs 422 de l'API. */
const SERVER_FIELDS: Record<string, keyof Values> = {
  name: 'name',
  slug: 'slug',
  city: 'city',
  cycles: 'cycles',
  'director.name': 'directorName',
  'director.phone': 'directorPhone',
  'director.email': 'directorEmail',
}

type Created = Awaited<ReturnType<ReturnType<typeof useCreateSchool>['mutateAsync']>>

/** Création d'une école par le super-admin (vraie API). */
export function CreateSchoolPage() {
  const { t } = useTranslation()
  const create = useCreateSchool()
  const [created, setCreated] = useState<Created | null>(null)
  const [failed, setFailed] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const domain = env.tenantDomain ?? 'lecolso.ci'

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
      city: '',
      cycles: ['kindergarten', 'primary'],
      directorName: '',
      directorPhone: '',
      directorEmail: '',
    },
  })
  const { register, handleSubmit, setValue, setError, control, formState, reset } = form
  const slug = useWatch({ control, name: 'slug' })
  const cycles = useWatch({ control, name: 'cycles' })

  const message = (value: string | undefined): string | undefined => {
    if (value === undefined) return undefined
    const code = CODES.find((candidate) => candidate === value)
    return code === undefined ? value : t(`platform.create.errors.${code}`)
  }

  const submit = handleSubmit(async (values) => {
    setFailed(false)
    const input: CreateSchoolInput = {
      name: values.name.trim(),
      slug: values.slug,
      city: values.city.trim() === '' ? null : values.city.trim(),
      cycles: values.cycles,
      director: {
        name: values.directorName.trim(),
        phone: normalizeCiPhone(values.directorPhone) ?? values.directorPhone,
        email: values.directorEmail.trim() === '' ? null : values.directorEmail.trim(),
      },
    }
    try {
      setCreated(await create.mutateAsync(input))
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        setFailed(true)
        return
      }
      for (const [key, messages] of Object.entries(error.fields)) {
        const field = SERVER_FIELDS[key.replace(/\.\d+$/, '')]
        const text = messages[0]
        if (field !== undefined && text !== undefined)
          setError(field, { type: 'server', message: text })
      }
    }
  })

  if (created !== null) {
    const password = created.director.provisional_password
    return (
      <div className="grid gap-6">
        <ScreenHeader
          demo={false}
          title={t('platform.create.doneTitle', { name: created.data.name })}
          description={t('platform.create.doneDescription')}
        />
        <Card>
          <CardContent className="grid gap-4 pt-6">
            <p className="flex items-center gap-2 font-semibold text-success-ink">
              <CheckCircle2 aria-hidden className="size-5" />
              {created.director.name}
            </p>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-muted p-4">
                <dt className="text-xs font-semibold text-muted-foreground uppercase">
                  {t('platform.create.login')}
                </dt>
                <dd className="tabular font-display text-lg font-bold">
                  {formatPhone(created.director.phone)}
                </dd>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <dt className="text-xs font-semibold text-muted-foreground uppercase">
                  {t('platform.create.password')}
                </dt>
                <dd className="flex items-center justify-between gap-2">
                  {password === null ? (
                    <span className="text-sm">
                      {t('platform.create.existingAccount', { name: created.director.name })}
                    </span>
                  ) : (
                    <>
                      <code className="font-display text-lg font-bold tracking-wide">
                        {password}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('settings.users.copy')}
                        onClick={() => {
                          void navigator.clipboard.writeText(password).then(() => {
                            toast(t('settings.users.copied'), { tone: 'success' })
                          })
                        }}
                      >
                        <Copy aria-hidden />
                      </Button>
                    </>
                  )}
                </dd>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <dt className="text-xs font-semibold text-muted-foreground uppercase">
                  {t('platform.create.publicPage')}
                </dt>
                <dd>
                  <Link
                    to="/ecole/$slug"
                    params={{ slug: created.data.slug }}
                    className="font-semibold underline underline-offset-4"
                  >
                    {`${created.data.slug}.${domain}`}
                  </Link>
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/plateforme">{t('platform.create.list')}</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  reset()
                  setSlugTouched(false)
                  setCreated(null)
                }}
              >
                <Plus aria-hidden />
                {t('platform.create.another')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <Button asChild variant="ghost" size="sm" className="justify-self-start">
        <Link to="/plateforme">
          <ArrowLeft aria-hidden />
          {t('platform.create.back')}
        </Link>
      </Button>
      <ScreenHeader
        demo={false}
        title={t('platform.create.title')}
        description={t('platform.create.description')}
      />
      {failed && (
        <p
          role="alert"
          className="rounded-xl bg-destructive-soft px-4 py-3 text-sm font-medium text-destructive-ink"
        >
          {t('platform.create.failed')}
        </p>
      )}
      <form
        noValidate
        className="grid gap-6 lg:grid-cols-2"
        onSubmit={(event) => void submit(event)}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 aria-hidden className="size-5 text-accent-ink" />
              {t('platform.create.school')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field
              label={t('platform.create.name')}
              error={message(formState.errors.name?.message)}
            >
              {(c) => (
                <Input
                  {...c}
                  {...register('name', {
                    onChange: (event: { target: { value: string } }) => {
                      if (!slugTouched) setValue('slug', slugify(event.target.value))
                    },
                  })}
                />
              )}
            </Field>
            <Field
              label={t('platform.create.slug')}
              hint={t('platform.create.slugHint', { url: `${slug === '' ? '…' : slug}.${domain}` })}
              error={message(formState.errors.slug?.message)}
            >
              {(c) => (
                <Input
                  {...c}
                  {...register('slug', {
                    onChange: () => {
                      setSlugTouched(true)
                    },
                  })}
                  autoCapitalize="none"
                  spellCheck={false}
                />
              )}
            </Field>
            <Field
              label={t('platform.create.city')}
              error={message(formState.errors.city?.message)}
            >
              {(c) => <Input {...c} {...register('city')} />}
            </Field>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">{t('platform.create.cycles')}</legend>
              {CYCLES.map((code) => (
                <div key={code} className="flex items-center gap-3">
                  <Checkbox
                    id={`cycle-${code}`}
                    checked={cycles.includes(code)}
                    onCheckedChange={(checked) => {
                      setValue(
                        'cycles',
                        checked === true
                          ? [...cycles, code]
                          : cycles.filter((item) => item !== code),
                        { shouldValidate: true },
                      )
                    }}
                  />
                  <Label htmlFor={`cycle-${code}`}>{t(`cycles.${code}`)}</Label>
                </div>
              ))}
              {formState.errors.cycles !== undefined && (
                <p role="alert" className="text-[13px] font-medium text-destructive-ink">
                  {message(
                    formState.errors.cycles.message ?? formState.errors.cycles.root?.message,
                  )}
                </p>
              )}
            </fieldset>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('platform.create.director')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field
              label={t('platform.create.directorName')}
              error={message(formState.errors.directorName?.message)}
            >
              {(c) => <Input {...c} {...register('directorName')} />}
            </Field>
            <Field
              label={t('platform.create.directorPhone')}
              hint={t('platform.create.directorPhoneHint')}
              error={message(formState.errors.directorPhone?.message)}
            >
              {(c) => <Input {...c} type="tel" inputMode="tel" {...register('directorPhone')} />}
            </Field>
            <Field
              label={t('platform.create.directorEmail')}
              error={message(formState.errors.directorEmail?.message)}
            >
              {(c) => <Input {...c} type="email" {...register('directorEmail')} />}
            </Field>
            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="mt-2"
              disabled={create.isPending}
            >
              <Plus aria-hidden />
              {t(create.isPending ? 'platform.create.submitting' : 'platform.create.submit')}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
