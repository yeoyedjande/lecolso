import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod/mini'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { FormAlert } from '@/features/auth/components/FormAlert'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import type { Cycle } from '@/features/cycles/api'
import type { Permission, SchoolRole } from '@/features/roles/api'
import { ValidationError } from '@/lib/api/errors'
import { normalizeCiPhone } from '@/lib/phone'

import { useCreateUser, UserActionError, type CreatedUser } from '../api'
import { defaultScope, manageableCycles } from '../grants'

import { ProvisionalPassword } from './ProvisionalPassword'
import { RoleScopePicker } from './RoleScopePicker'

const schema = z.object({
  name: z.string().check(z.trim(), z.minLength(2, 'nameMin')),
  phone: z.string().check(z.refine((value) => normalizeCiPhone(value) !== null, 'phone')),
  email: z
    .string()
    .check(z.refine((value) => value.trim() === '' || /^\S+@\S+\.\S+$/.test(value), 'email')),
  scope: z.object({
    role: z.string().check(z.minLength(1, 'role')),
    cycleId: z.nullable(z.string()),
  }),
})

type Values = z.infer<typeof schema>

/** Ajout d'un compte avec un premier rôle ; affiche ensuite le mot de passe provisoire (une seule fois). */
export function CreateUserSheet({
  roles,
  catalog,
  cycles,
  onDone,
}: {
  roles: SchoolRole[]
  catalog: Permission[]
  cycles: Cycle[]
  onDone: () => void
}) {
  const { t } = useTranslation()
  const school = useCurrentSchool()
  const create = useCreateUser()
  const [failed, setFailed] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedUser | null>(null)
  const defaults: Values = {
    name: '',
    phone: '',
    email: '',
    scope: defaultScope(manageableCycles(school)),
  }

  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults })

  const message = (error: { message?: string; type?: string } | undefined): string | undefined => {
    if (error?.message === undefined) return undefined
    if (error.type === 'server') return error.message
    switch (error.message) {
      case 'nameMin':
      case 'phone':
      case 'email':
      case 'role':
        return t(`usersAdmin.createSheet.errors.${error.message}`)
      default:
        return error.message
    }
  }

  const submit = handleSubmit(async (values) => {
    setFailed(null)
    try {
      const result = await create.mutateAsync({
        name: values.name,
        phone: values.phone,
        email: values.email.trim() === '' ? null : values.email.trim(),
        roles: [{ role: values.scope.role, cycle_id: values.scope.cycleId }],
      })
      setCreated(result)
    } catch (error) {
      if (error instanceof ValidationError) {
        for (const field of ['name', 'phone', 'email'] as const) {
          const text = error.fields[field]?.[0]
          if (text !== undefined) setError(field, { type: 'server', message: text })
        }
        const roleError = error.fields['roles.0.role']?.[0] ?? error.fields['roles.0.cycle_id']?.[0]
        if (roleError !== undefined) setError('scope.role', { type: 'server', message: roleError })
        return
      }
      setFailed(
        error instanceof UserActionError && error.status === 403
          ? t('usersAdmin.sheet.forbidden')
          : t('usersAdmin.sheet.failed'),
      )
    }
  })

  if (created !== null) {
    const name = created.user.name
    return (
      <div className="grid content-start gap-5 p-6 pr-16">
        <SheetTitle className="font-display text-xl font-bold">
          {created.provisionalPassword === null
            ? t('usersAdmin.createSheet.linkedTitle')
            : t('usersAdmin.createSheet.createdTitle')}
        </SheetTitle>
        <SheetDescription className="sr-only">{name}</SheetDescription>
        {created.provisionalPassword === null ? (
          <p className="text-sm">{t('usersAdmin.createSheet.linkedDescription', { name })}</p>
        ) : (
          <ProvisionalPassword
            password={created.provisionalPassword}
            intro={t('usersAdmin.createSheet.createdDescription', { name })}
          />
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setCreated(null)
              reset(defaults)
            }}
          >
            {t('usersAdmin.createSheet.another')}
          </Button>
          <Button variant="accent" onClick={onDone}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="grid gap-1.5 border-b px-6 pt-6 pb-4 pr-16">
        <SheetTitle className="font-display text-xl font-bold">
          {t('usersAdmin.createSheet.title')}
        </SheetTitle>
        <SheetDescription className="text-sm text-muted-foreground">
          {t('usersAdmin.createSheet.description')}
        </SheetDescription>
      </div>
      <div className="grid flex-1 content-start gap-5 overflow-y-auto px-6 py-5">
        {failed !== null && <FormAlert>{failed}</FormAlert>}
        <Field label={t('usersAdmin.sheet.name')} error={message(errors.name)}>
          {(control) => <Input {...control} {...register('name')} autoComplete="off" />}
        </Field>
        <Field label={t('usersAdmin.sheet.phone')} error={message(errors.phone)}>
          {(control) => (
            <Input
              {...control}
              {...register('phone')}
              type="tel"
              inputMode="tel"
              autoComplete="off"
            />
          )}
        </Field>
        <Field
          label={t('usersAdmin.sheet.email')}
          hint={t('usersAdmin.sheet.emailHint')}
          error={message(errors.email)}
        >
          {(control) => (
            <Input {...control} {...register('email')} type="email" autoComplete="off" />
          )}
        </Field>
        <Controller
          control={control}
          name="scope"
          render={({ field }) => (
            <RoleScopePicker
              value={field.value}
              onChange={field.onChange}
              roles={roles}
              catalog={catalog}
              cycles={cycles}
              error={message(errors.scope?.role)}
            />
          )}
        />
      </div>
      <div className="flex justify-end gap-2 border-t px-6 py-4">
        <Button type="button" variant="ghost" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="accent" disabled={isSubmitting}>
          <UserPlus aria-hidden />
          {t('usersAdmin.createSheet.submit')}
        </Button>
      </div>
    </form>
  )
}
