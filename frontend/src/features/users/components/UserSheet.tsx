import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Plus, Power, Save, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod/mini'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { can } from '@/features/auth/access'
import { useMe } from '@/features/auth/api'
import { useRoleLabel } from '@/features/auth/roles'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import type { Cycle } from '@/features/cycles/api'
import type { Permission, SchoolRole } from '@/features/roles/api'
import { ConflictError, ValidationError } from '@/lib/api/errors'
import { formatPhone } from '@/lib/format'
import { normalizeCiPhone } from '@/lib/phone'
import { toast } from '@/lib/toast'

import {
  useAssignRole,
  useResetPassword,
  useRevokeRole,
  useSetUserActive,
  useUpdateUser,
  UserActionError,
  type SchoolUser,
} from '../api'
import { defaultScope, manageableCycles, type RoleScope } from '../grants'

import { ProvisionalPassword } from './ProvisionalPassword'
import { RoleScopePicker } from './RoleScopePicker'

const identitySchema = z.object({
  name: z.string().check(z.trim(), z.minLength(2, 'nameMin')),
  phone: z.string().check(z.refine((value) => normalizeCiPhone(value) !== null, 'phone')),
  email: z
    .string()
    .check(z.refine((value) => value.trim() === '' || /^\S+@\S+\.\S+$/.test(value), 'email')),
})

type IdentityValues = z.infer<typeof identitySchema>

/** Fiche d'un compte de l'école : identité, rôles par périmètre, accès (mot de passe, désactivation, suppression). */
export function UserSheet({
  user: initial,
  roles,
  catalog,
  cycles,
  onRemove,
}: {
  user: SchoolUser
  roles: SchoolRole[]
  catalog: Permission[]
  cycles: Cycle[]
  onRemove: (user: SchoolUser) => void
}) {
  const { t } = useTranslation()
  const school = useCurrentSchool()
  const me = useMe()
  const roleLabel = useRoleLabel()
  const update = useUpdateUser()
  const assign = useAssignRole()
  const revoke = useRevokeRole()
  const setActive = useSetUserActive()
  const resetPassword = useResetPassword()
  const [user, setUser] = useState(initial)
  const [scope, setScope] = useState<RoleScope>(defaultScope(manageableCycles(school)))
  const [password, setPassword] = useState<string | null>(null)
  const manage = user.can_manage
  const self = me.data?.id === user.id

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<IdentityValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: { name: user.name, phone: formatPhone(user.phone), email: user.email ?? '' },
  })

  const fail = (error: unknown) => {
    toast(
      error instanceof ConflictError
        ? error.code === 'last_role'
          ? t('usersAdmin.sheet.lastRole')
          : error.message
        : error instanceof UserActionError && error.status === 403
          ? t('usersAdmin.sheet.forbidden')
          : t('usersAdmin.sheet.failed'),
      { tone: 'error' },
    )
  }

  const message = (error: { message?: string; type?: string } | undefined): string | undefined => {
    if (error?.message === undefined) return undefined
    if (error.type === 'server') return error.message
    switch (error.message) {
      case 'nameMin':
      case 'phone':
      case 'email':
        return t(`usersAdmin.createSheet.errors.${error.message}`)
      default:
        return error.message
    }
  }

  const saveIdentity = handleSubmit(async (values) => {
    try {
      const saved = await update.mutateAsync({
        id: user.id,
        input: {
          name: values.name,
          phone: values.phone,
          email: values.email.trim() === '' ? null : values.email.trim(),
        },
      })
      setUser(saved)
      toast(t('usersAdmin.sheet.saved', { name: saved.name }), { tone: 'success' })
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        fail(error)
        return
      }
      for (const field of ['name', 'phone', 'email'] as const) {
        const text = error.fields[field]?.[0]
        if (text !== undefined) setError(field, { type: 'server', message: text })
      }
    }
  })

  const cycleName = (cycleId: string | null) =>
    cycleId === null
      ? t('usersAdmin.wholeSchool')
      : (cycles.find((cycle) => cycle.id === cycleId)?.name ?? cycleId)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid gap-2 border-b px-6 pt-6 pb-4 pr-16">
        <SheetTitle className="font-display text-xl font-bold">{user.name}</SheetTitle>
        <SheetDescription className="tabular text-sm text-muted-foreground">
          {formatPhone(user.phone)}
        </SheetDescription>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={user.active ? 'success' : 'destructive'}>
            {user.active ? t('usersAdmin.active') : t('usersAdmin.deactivated')}
          </Badge>
          {self && <Badge variant="secondary">{t('usersAdmin.you')}</Badge>}
        </div>
      </div>

      <div className="grid flex-1 content-start gap-6 overflow-y-auto px-6 py-5">
        {!manage && (
          <p className="rounded-xl bg-muted px-4 py-3 text-sm">{t('usersAdmin.sheet.readOnly')}</p>
        )}

        <section aria-labelledby="user-identity" className="grid gap-4">
          <h3 id="user-identity" className="font-semibold">
            {t('usersAdmin.sheet.identity')}
          </h3>
          <form noValidate className="grid gap-4" onSubmit={(event) => void saveIdentity(event)}>
            <Field label={t('usersAdmin.sheet.name')} error={message(errors.name)}>
              {(control) => (
                <Input {...control} {...register('name')} readOnly={!manage} autoComplete="off" />
              )}
            </Field>
            <Field label={t('usersAdmin.sheet.phone')} error={message(errors.phone)}>
              {(control) => (
                <Input
                  {...control}
                  {...register('phone')}
                  type="tel"
                  inputMode="tel"
                  readOnly={!manage}
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
                <Input
                  {...control}
                  {...register('email')}
                  type="email"
                  readOnly={!manage}
                  autoComplete="off"
                />
              )}
            </Field>
            {manage && (
              <div>
                <Button type="submit" variant="outline" disabled={isSubmitting}>
                  <Save aria-hidden />
                  {t('usersAdmin.sheet.saveIdentity')}
                </Button>
              </div>
            )}
          </form>
        </section>

        <section aria-labelledby="user-roles" className="grid gap-3">
          <h3 id="user-roles" className="font-semibold">
            {t('usersAdmin.sheet.roles')}
          </h3>
          <ul className="grid gap-2">
            {user.roles.map((assignment) => {
              const label = roleLabel({ role: assignment.role, name: assignment.role_name })
              return (
                <li
                  key={assignment.id}
                  className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
                >
                  <span className="grid min-w-0">
                    <span className="font-medium">{label}</span>
                    <span className="text-sm text-muted-foreground">
                      {cycleName(assignment.cycle_id)}
                    </span>
                  </span>
                  {manage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('usersAdmin.sheet.removeRole', { role: label })}
                      disabled={revoke.isPending}
                      onClick={() => {
                        revoke
                          .mutateAsync({ id: user.id, assignment: assignment.id })
                          .then(setUser)
                          .catch(fail)
                      }}
                    >
                      <X aria-hidden />
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
          {manage && (
            <div className="grid gap-3 rounded-2xl border border-dashed p-4">
              <p className="text-sm font-semibold">{t('usersAdmin.sheet.addRole')}</p>
              <RoleScopePicker
                value={scope}
                onChange={setScope}
                roles={roles}
                catalog={catalog}
                cycles={cycles}
              />
              <div>
                <Button
                  variant="outline"
                  disabled={scope.role === '' || assign.isPending}
                  onClick={() => {
                    assign
                      .mutateAsync({ id: user.id, role: scope.role, cycleId: scope.cycleId })
                      .then((saved) => {
                        setUser(saved)
                        setScope({ ...scope, role: '' })
                        toast(t('usersAdmin.sheet.assigned'), { tone: 'success' })
                      })
                      .catch((error: unknown) => {
                        if (error instanceof ValidationError) {
                          toast(Object.values(error.fields)[0]?.[0] ?? error.message, {
                            tone: 'error',
                          })
                          return
                        }
                        fail(error)
                      })
                  }}
                >
                  <Plus aria-hidden />
                  {t('usersAdmin.sheet.assign')}
                </Button>
              </div>
            </div>
          )}
        </section>

        {(manage || (can(school, 'users.reset_password') && !self)) && (
          <section aria-labelledby="user-access" className="grid gap-3">
            <h3 id="user-access" className="font-semibold">
              {t('usersAdmin.sheet.access')}
            </h3>
            {password !== null && (
              <ProvisionalPassword
                password={password}
                intro={t('usersAdmin.sheet.resetDone', { name: user.name })}
              />
            )}
            <div className="flex flex-wrap gap-2">
              {can(school, 'users.reset_password') && !self && (
                <Button
                  variant="outline"
                  disabled={resetPassword.isPending}
                  onClick={() => {
                    resetPassword.mutateAsync(user.id).then(setPassword).catch(fail)
                  }}
                >
                  <KeyRound aria-hidden />
                  {t('usersAdmin.sheet.resetPassword')}
                </Button>
              )}
              {manage && (
                <Button
                  variant="outline"
                  disabled={setActive.isPending}
                  onClick={() => {
                    setActive
                      .mutateAsync({ id: user.id, active: !user.active })
                      .then((saved) => {
                        setUser(saved)
                        toast(
                          saved.active
                            ? t('usersAdmin.sheet.reactivated', { name: saved.name })
                            : t('usersAdmin.sheet.deactivated', { name: saved.name }),
                          { tone: 'success' },
                        )
                      })
                      .catch(fail)
                  }}
                >
                  <Power aria-hidden />
                  {user.active
                    ? t('usersAdmin.sheet.deactivate')
                    : t('usersAdmin.sheet.reactivate')}
                </Button>
              )}
              {manage && (
                <Button
                  variant="ghost"
                  className="text-destructive-ink"
                  onClick={() => {
                    onRemove(user)
                  }}
                >
                  <Trash2 aria-hidden />
                  {t('usersAdmin.sheet.remove')}
                </Button>
              )}
            </div>
            {manage && user.active && (
              <p className="text-sm text-muted-foreground">
                {t('usersAdmin.sheet.deactivateHint')}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
