import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod/mini'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ValidationError } from '@/lib/api/errors'

import { LoginError, useLogin, type Profile } from '../api'

import { FormAlert } from './FormAlert'
import { PasswordInput } from './PasswordInput'

const schema = z.object({
  login: z.string().check(z.trim(), z.minLength(1)),
  password: z.string().check(z.minLength(1)),
  remember: z.boolean(),
})

type Values = z.infer<typeof schema>

/**
 * Connexion par téléphone ou e-mail. Les erreurs 422 (identifiants refusés, même message dans tous les cas)
 * s'affichent sur le champ identifiant ; 429 et erreurs réseau en tête de formulaire.
 */
export function LoginForm({ onSuccess }: { onSuccess: (profile: Profile) => void }) {
  const { t } = useTranslation()
  const login = useLogin()
  const [formError, setFormError] = useState<'throttled' | 'unavailable' | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { login: '', password: '', remember: false },
  })

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      onSuccess(await login.mutateAsync(values))
    } catch (error) {
      if (error instanceof ValidationError) {
        const message = error.fields.login?.[0] ?? error.fields.password?.[0] ?? error.message
        setError('login', { type: 'server', message })
      } else {
        setFormError(
          error instanceof LoginError && error.reason === 'throttled' ? 'throttled' : 'unavailable',
        )
      }
    }
  })

  // Erreur locale (champ vide) : message i18n ; erreur du serveur : message déjà en français
  const loginError =
    errors.login === undefined
      ? undefined
      : errors.login.type === 'server'
        ? errors.login.message
        : t('auth.login.required.identifier')
  const passwordError =
    errors.password === undefined ? undefined : t('auth.login.required.password')

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-5">
      {formError !== null && (
        <FormAlert>
          {t(formError === 'throttled' ? 'auth.login.throttled' : 'auth.login.failed')}
        </FormAlert>
      )}

      <Field
        label={t('auth.login.identifier')}
        hint={t('auth.login.identifierHint')}
        error={loginError}
      >
        {(control) => (
          <Input
            {...control}
            {...register('login')}
            autoComplete="username"
            inputMode="email"
            autoFocus
          />
        )}
      </Field>

      <Field label={t('auth.login.password')} error={passwordError}>
        {(control) => (
          <PasswordInput {...control} {...register('password')} autoComplete="current-password" />
        )}
      </Field>

      <Controller
        control={control}
        name="remember"
        render={({ field }) => (
          <div className="flex items-start gap-3">
            <Checkbox
              id="remember"
              checked={field.value}
              onCheckedChange={(checked) => {
                field.onChange(checked === true)
              }}
              aria-describedby="remember-hint"
              className="mt-0.5"
            />
            <div className="grid gap-0.5">
              <Label htmlFor="remember">{t('auth.login.remember')}</Label>
              <p id="remember-hint" className="text-[13px] text-muted-foreground">
                {t('auth.login.rememberHint')}
              </p>
            </div>
          </div>
        )}
      />

      <Button type="submit" size="lg" disabled={login.isPending} className="w-full">
        <LogIn aria-hidden />
        {t(login.isPending ? 'auth.login.submitting' : 'auth.login.submit')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">{t('auth.login.forgot')}</p>
    </form>
  )
}
