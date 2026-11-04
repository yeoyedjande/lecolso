import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, Save } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod/mini'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { FormAlert } from '@/features/auth/components/FormAlert'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { ValidationError } from '@/lib/api/errors'
import { toast } from '@/lib/toast'

import { useCreateRole, useUpdateRole, type Permission, type SchoolRole } from '../api'
import { canGrant, groupPermissions } from '../permissions'

const schema = z.object({
  name: z.string().check(z.trim(), z.minLength(2, 'nameMin'), z.maxLength(60, 'nameMax')),
  description: z.string().check(z.maxLength(255, 'descriptionMax')),
  permissions: z.array(z.string()),
})

type Values = z.infer<typeof schema>

/** Ce que l'éditeur affiche : création (éventuellement depuis un modèle), modification ou simple lecture. */
export type EditorMode =
  | { kind: 'create'; template: SchoolRole | null }
  | { kind: 'edit'; role: SchoolRole }
  | { kind: 'view'; role: SchoolRole }

/** Contenu du panneau d'édition d'un rôle : nom (rôle personnalisé), permissions groupées par module. */
export function RoleEditor({
  mode,
  catalog,
  label,
  onDone,
}: {
  mode: EditorMode
  catalog: Permission[]
  label: (role: SchoolRole) => string
  onDone: () => void
}) {
  const { t } = useTranslation()
  const school = useCurrentSchool()
  const create = useCreateRole()
  const update = useUpdateRole()
  const [failed, setFailed] = useState<string | null>(null)

  const source = mode.kind === 'create' ? mode.template : mode.role
  const readOnly = mode.kind === 'view'
  const isSystem = mode.kind !== 'create' && mode.role.is_system
  const initial = source?.permissions ?? []
  const groups = groupPermissions(catalog)
  const total = groups.reduce((sum, group) => sum + group.permissions.length, 0)

  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:
        mode.kind === 'create'
          ? mode.template === null
            ? ''
            : t('rolesAdmin.copyOf', { name: label(mode.template) })
          : isSystem
            ? label(mode.role)
            : (mode.role.name ?? ''),
      description: mode.kind === 'create' ? '' : (mode.role.description ?? ''),
      permissions: initial,
    },
  })

  const selected = useWatch({ control, name: 'permissions' })
  // Pas d'élévation : on ne coche que ce que l'on détient sur toute l'école (ce qui est déjà dans le rôle reste modifiable)
  const grantable = (permission: string) =>
    !readOnly && (canGrant(school, permission) || initial.includes(permission))

  const toggle = (permission: string, checked: boolean) => {
    const next = checked
      ? [...selected, permission]
      : selected.filter((current) => current !== permission)
    setValue('permissions', [...new Set(next)], { shouldDirty: true })
  }

  const errorOf = (field: 'name' | 'description'): string | undefined => {
    const error = errors[field]
    if (error?.message === undefined) return undefined
    if (error.type === 'server') return error.message
    const code = error.message
    if (code === 'nameMin' || code === 'nameMax' || code === 'descriptionMax') {
      return t(`rolesAdmin.editor.errors.${code}`)
    }
    return code
  }

  const submit = handleSubmit(async (values) => {
    setFailed(null)
    const description = values.description.trim() === '' ? null : values.description.trim()
    try {
      if (mode.kind === 'create') {
        const role = await create.mutateAsync({
          name: values.name,
          description,
          permissions: values.permissions,
        })
        toast(t('rolesAdmin.editor.created', { name: label(role) }), { tone: 'success' })
      } else {
        const role = await update.mutateAsync({
          key: mode.role.key,
          input: isSystem
            ? { permissions: values.permissions }
            : { name: values.name, description, permissions: values.permissions },
        })
        toast(t('rolesAdmin.editor.saved', { name: label(role) }), { tone: 'success' })
      }
      onDone()
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        setFailed(t('rolesAdmin.editor.failed'))
        return
      }
      for (const field of ['name', 'description'] as const) {
        const message = error.fields[field]?.[0]
        if (message !== undefined) setError(field, { type: 'server', message })
      }
      const permissionMessage = Object.entries(error.fields).find(([field]) =>
        field.startsWith('permissions'),
      )?.[1][0]
      if (permissionMessage !== undefined) setFailed(permissionMessage)
    }
  })

  const title =
    mode.kind === 'create'
      ? t('rolesAdmin.editor.createTitle')
      : mode.kind === 'edit'
        ? t('rolesAdmin.editor.editTitle', { name: label(mode.role) })
        : t('rolesAdmin.editor.viewTitle', { name: label(mode.role) })

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="grid gap-1.5 border-b px-6 pt-6 pb-4 pr-16">
        <SheetTitle className="font-display text-xl font-bold">{title}</SheetTitle>
        <SheetDescription className="text-sm text-muted-foreground">
          {readOnly
            ? t('rolesAdmin.lockedHint')
            : isSystem
              ? t('rolesAdmin.editor.systemEditDescription')
              : t('rolesAdmin.editor.description')}
        </SheetDescription>
      </div>

      <div className="grid flex-1 content-start gap-5 overflow-y-auto px-6 py-5">
        {failed !== null && <FormAlert>{failed}</FormAlert>}

        {!isSystem && (
          <>
            <Field label={t('rolesAdmin.editor.name')} error={errorOf('name')}>
              {(control) => (
                <Input
                  {...control}
                  {...register('name')}
                  placeholder={t('rolesAdmin.editor.namePlaceholder')}
                  autoComplete="off"
                  readOnly={readOnly}
                />
              )}
            </Field>
            <Field
              label={t('rolesAdmin.editor.roleDescription')}
              hint={t('rolesAdmin.editor.optional')}
              error={errorOf('description')}
            >
              {(control) => (
                <Textarea
                  {...control}
                  {...register('description')}
                  rows={2}
                  placeholder={t('rolesAdmin.editor.roleDescriptionPlaceholder')}
                  readOnly={readOnly}
                />
              )}
            </Field>
          </>
        )}

        <fieldset className="grid gap-4">
          <legend className="mb-1 flex w-full items-center justify-between gap-3 font-semibold">
            <span>{t('rolesAdmin.editor.permissions')}</span>
            <Badge variant="secondary" className="tabular">
              {t('rolesAdmin.editor.selectedCount', { count: selected.length, total })}
            </Badge>
          </legend>
          <div className="grid gap-4">
            {groups.map(({ group, permissions }) => {
              const editable = permissions.filter(grantable)
              const allOn = editable.every((permission) => selected.includes(permission))
              return (
                <section
                  key={group}
                  aria-labelledby={`group-${group}`}
                  className="grid gap-2 rounded-2xl border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 id={`group-${group}`} className="text-sm font-semibold">
                      {t(`permissionGroups.${group}`, {
                        defaultValue: t('permissionGroups.other'),
                      })}
                    </h3>
                    {!readOnly && editable.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const next = allOn
                            ? selected.filter((current) => !editable.includes(current))
                            : [...new Set([...selected, ...editable])]
                          setValue('permissions', next, { shouldDirty: true })
                        }}
                      >
                        {allOn ? t('rolesAdmin.editor.none') : t('rolesAdmin.editor.all')}
                      </Button>
                    )}
                  </div>
                  <ul className="grid gap-1">
                    {permissions.map((permission) => {
                      const id = `permission-${permission}`
                      const disabled = !grantable(permission)
                      return (
                        <li key={permission}>
                          <label
                            htmlFor={id}
                            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-muted has-[:disabled]:cursor-not-allowed has-[:disabled]:hover:bg-transparent"
                          >
                            <Checkbox
                              id={id}
                              className="mt-0.5"
                              checked={selected.includes(permission)}
                              disabled={disabled}
                              onCheckedChange={(checked) => {
                                toggle(permission, checked === true)
                              }}
                            />
                            <span className="grid gap-0.5 text-sm">
                              <span>
                                {t(`permissions.${permission}`, { defaultValue: permission })}
                              </span>
                              {disabled && !readOnly && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Lock aria-hidden className="size-3" />
                                  {t('rolesAdmin.editor.notHeld')}
                                </span>
                              )}
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </div>
        </fieldset>
      </div>

      <div className="flex justify-end gap-2 border-t px-6 py-4">
        <Button type="button" variant="ghost" onClick={onDone}>
          {readOnly ? t('common.close') : t('common.cancel')}
        </Button>
        {!readOnly && (
          <Button type="submit" variant="accent" disabled={isSubmitting}>
            <Save aria-hidden />
            {t('rolesAdmin.editor.save')}
          </Button>
        )}
      </div>
    </form>
  )
}
