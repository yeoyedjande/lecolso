import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod/mini'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { ValidationError } from '@/lib/api/errors'
import { cn } from '@/lib/utils'

import { useChangePassword } from '../api'
import { passwordScore, strengthLevel } from '../passwordStrength'

import { FormAlert } from './FormAlert'
import { PasswordInput } from './PasswordInput'

const schema = z
  .object({
    current_password: z.string().check(z.minLength(1, 'current')),
    password: z.string().check(z.minLength(8, 'min')),
    password_confirmation: z.string(),
  })
  .check(
    z.refine((values) => values.password === values.password_confirmation, {
      path: ['password_confirmation'],
      message: 'mismatch',
    }),
    z.refine((values) => values.password === '' || values.password !== values.current_password, {
      path: ['password'],
      message: 'same',
    }),
  )

type Values = z.infer<typeof schema>
type LocalCode = 'current' | 'min' | 'mismatch' | 'same'

const BAR_TONES = [
  'bg-warm-200',
  'bg-destructive',
  'bg-accent',
  'bg-cycle-primary',
  'bg-success',
] as const

/** Changement de mot de passe (obligatoire après un mot de passe provisoire). Erreurs 422 sur les champs. */
export function ChangePasswordForm({
  required,
  onSuccess,
}: {
  required: boolean
  onSuccess: () => void
}) {
  const { t } = useTranslation()
  const change = useChangePassword()
  const [failed, setFailed] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  })

  const password = useWatch({ control, name: 'password' })
  const score = passwordScore(password)

  const submit = handleSubmit(async (values) => {
    setFailed(false)
    try {
      await change.mutateAsync(values)
      onSuccess()
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        setFailed(true)
        return
      }
      for (const field of ['current_password', 'password', 'password_confirmation'] as const) {
        const message = error.fields[field]?.[0]
        if (message !== undefined) setError(field, { type: 'server', message })
      }
    }
  })

  const localMessage = (code: LocalCode): string => {
    switch (code) {
      case 'current':
        return t('auth.password.errors.current')
      case 'min':
        return t('auth.password.errors.min')
      case 'mismatch':
        return t('auth.password.errors.mismatch')
      case 'same':
        return t('auth.password.errors.same')
    }
  }

  const errorOf = (field: keyof Values): string | undefined => {
    const error = errors[field]
    if (error === undefined) return undefined
    const code = error.message
    if (
      error.type !== 'server' &&
      (code === 'current' || code === 'min' || code === 'mismatch' || code === 'same')
    ) {
      return localMessage(code)
    }
    return code
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-5">
      {failed && <FormAlert>{t('auth.password.failed')}</FormAlert>}

      <Field
        label={t('auth.password.current')}
        hint={required ? t('auth.password.currentHintRequired') : undefined}
        error={errorOf('current_password')}
      >
        {(control) => (
          <PasswordInput
            {...control}
            {...register('current_password')}
            autoComplete="current-password"
          />
        )}
      </Field>

      <Field
        label={t('auth.password.new')}
        hint={t('auth.password.newHint')}
        error={errorOf('password')}
      >
        {(control) => (
          <PasswordInput {...control} {...register('password')} autoComplete="new-password" />
        )}
      </Field>

      <div className="grid gap-2" aria-live="polite">
        <div className="grid grid-cols-4 gap-1.5" aria-hidden>
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className={cn(
                'h-1.5 rounded-full transition-colors',
                step <= score ? BAR_TONES[score] : 'bg-warm-200 dark:bg-white/10',
              )}
            />
          ))}
        </div>
        {password !== '' && (
          <p className="text-[13px] text-muted-foreground">
            {t('auth.password.strength.label', {
              level: t(`auth.password.strength.${strengthLevel(score)}`),
            })}
          </p>
        )}
      </div>

      <Field label={t('auth.password.confirm')} error={errorOf('password_confirmation')}>
        {(control) => (
          <PasswordInput
            {...control}
            {...register('password_confirmation')}
            autoComplete="new-password"
          />
        )}
      </Field>

      <Button type="submit" size="lg" disabled={change.isPending} className="w-full">
        <KeyRound aria-hidden />
        {t(change.isPending ? 'auth.password.submitting' : 'auth.password.submit')}
      </Button>
    </form>
  )
}
