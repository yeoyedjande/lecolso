import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod/mini'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { FormAlert } from '@/features/auth/components/FormAlert'
import { ConflictError, ValidationError } from '@/lib/api/errors'
import { formatPhone } from '@/lib/format'
import { normalizeCiAnyPhone } from '@/lib/phone'
import { toast } from '@/lib/toast'

import { useUpdateSchoolProfile, type SchoolProfile } from '../api'

import { LogoUploader } from './LogoUploader'

const schema = z.object({
  name: z.string().check(z.trim(), z.minLength(2, 'nameMin')),
  code: z.string().check(z.trim(), z.regex(/^[A-Za-z]{2,5}$/, 'code')),
  city: z.string(),
  address: z.string(),
  phone: z
    .string()
    .check(
      z.refine((value) => value.trim() === '' || normalizeCiAnyPhone(value) !== null, 'phone'),
    ),
  email: z
    .string()
    .check(z.refine((value) => value.trim() === '' || /^\S+@\S+\.\S+$/.test(value), 'email')),
  motto: z.string().check(z.maxLength(120, 'mottoMax')),
})

type Values = z.infer<typeof schema>
const FIELDS = ['name', 'code', 'city', 'address', 'phone', 'email', 'motto'] as const

/** Identité de l'école (vraie API) : logo, nom, coordonnées, devise ; modifiable par la direction de toute l'école. */
export function SchoolIdentityForm({
  profile,
  editable,
}: {
  profile: SchoolProfile
  editable: boolean
}) {
  const { t } = useTranslation()
  const update = useUpdateSchoolProfile()
  const [failed, setFailed] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: profile.name,
      code: profile.code,
      city: profile.city ?? '',
      address: profile.address ?? '',
      phone: profile.phone === null ? '' : formatPhone(profile.phone),
      email: profile.email ?? '',
      motto: profile.motto ?? '',
    },
  })

  const message = (field: keyof Values): string | undefined => {
    const error = errors[field]
    if (error?.message === undefined) return undefined
    if (error.type === 'server') return error.message
    switch (error.message) {
      case 'nameMin':
      case 'code':
      case 'phone':
      case 'email':
      case 'mottoMax':
        return t(`settings.identity.errors.${error.message}`)
      default:
        return error.message
    }
  }

  const submit = handleSubmit(async (values) => {
    setFailed(false)
    try {
      const saved = await update.mutateAsync({
        name: values.name.trim(),
        ...(profile.code_locked ? {} : { code: values.code.trim().toUpperCase() }),
        city: values.city.trim(),
        address: values.address.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        motto: values.motto.trim(),
      })
      reset({
        name: saved.name,
        code: saved.code,
        city: saved.city ?? '',
        address: saved.address ?? '',
        phone: saved.phone === null ? '' : formatPhone(saved.phone),
        email: saved.email ?? '',
        motto: saved.motto ?? '',
      })
      toast(t('settings.identity.saved'), { tone: 'success' })
    } catch (error) {
      if (error instanceof ConflictError && error.code === 'code_locked') {
        setError('code', { type: 'server', message: t('settings.identity.codeLocked') })
        return
      }
      if (!(error instanceof ValidationError)) {
        setFailed(true)
        return
      }
      for (const field of FIELDS) {
        const text = error.fields[field]?.[0]
        if (text !== undefined) setError(field, { type: 'server', message: text })
      }
    }
  })

  return (
    <Card>
      <CardContent className="grid gap-6 pt-6">
        <p className="text-sm text-muted-foreground">
          {editable ? t('settings.identity.publicHint') : t('settings.identity.readOnly')}
        </p>
        <div className="grid gap-2">
          <span className="text-sm font-semibold">{t('settings.identity.logo')}</span>
          <LogoUploader profile={profile} editable={editable} />
        </div>
        <form
          noValidate
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => void submit(event)}
        >
          {failed && (
            <div className="md:col-span-2">
              <FormAlert>{t('settings.identity.failed')}</FormAlert>
            </div>
          )}
          {FIELDS.map((field) => (
            <Field
              key={field}
              label={t(`settings.identity.${field}`)}
              hint={
                field === 'name'
                  ? undefined
                  : field === 'code'
                    ? profile.code_locked
                      ? t('settings.identity.codeLocked')
                      : t('settings.identity.codeHint')
                    : t('settings.identity.optional')
              }
              error={message(field)}
              className={field === 'address' || field === 'motto' ? 'md:col-span-2' : undefined}
            >
              {(control) => (
                <Input
                  {...control}
                  {...register(field)}
                  type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                  readOnly={!editable || (field === 'code' && profile.code_locked)}
                  autoComplete="off"
                />
              )}
            </Field>
          ))}
          {editable && (
            <div className="flex justify-end md:col-span-2">
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                <Save aria-hidden />
                {t('common.save')}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
