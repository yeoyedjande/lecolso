import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { useRoleLabel } from '@/features/auth/roles'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import type { Cycle } from '@/features/cycles/api'
import type { Permission, SchoolRole } from '@/features/roles/api'

import { canGrantRole, manageableCycles, type RoleScope } from '../grants'

const WHOLE_SCHOOL = ''

/**
 * Choix d'un rôle et de son périmètre (toute l'école ou un cycle) parmi ceux que l'utilisateur connecté peut
 * attribuer (mêmes règles que l'API : cycle, hiérarchie, pas d'élévation).
 */
export function RoleScopePicker({
  value,
  onChange,
  roles,
  catalog,
  cycles,
  error,
}: {
  value: RoleScope
  onChange: (value: RoleScope) => void
  roles: SchoolRole[]
  catalog: Permission[]
  cycles: Cycle[]
  error?: string | undefined
}) {
  const { t } = useTranslation()
  const id = useId()
  const school = useCurrentSchool()
  const roleLabel = useRoleLabel()
  const guardianOnly = new Set(
    catalog.filter((permission) => !permission.staff_assignable).map((p) => p.key),
  )
  const scope = manageableCycles(school)
  const scopes: (string | null)[] = [
    ...(scope === null ? [null] : []),
    ...cycles
      .filter((cycle) => scope === null || scope?.includes(cycle.id) === true)
      .map((c) => c.id),
  ]
  const grantable = roles.filter((role) => canGrantRole(school, role, value.cycleId, guardianOnly))

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor={`${id}-role`}>{t('usersAdmin.sheet.role')}</Label>
        <NativeSelect
          id={`${id}-role`}
          value={value.role}
          aria-invalid={error !== undefined}
          aria-describedby={error === undefined ? undefined : `${id}-error`}
          onChange={(event) => {
            onChange({ ...value, role: event.target.value })
          }}
        >
          <option value="">{t('usersAdmin.sheet.pickRole')}</option>
          {grantable.map((role) => (
            <option key={role.key} value={role.key}>
              {roleLabel({ role: role.key, name: role.name })}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-cycle`}>{t('usersAdmin.sheet.cycle')}</Label>
        <NativeSelect
          id={`${id}-cycle`}
          value={value.cycleId ?? WHOLE_SCHOOL}
          onChange={(event) => {
            const cycleId = event.target.value === WHOLE_SCHOOL ? null : event.target.value
            const role = roles.find((candidate) => candidate.key === value.role)
            // Le rôle choisi n'est plus attribuable sur ce périmètre : on le retire
            const keep = role !== undefined && canGrantRole(school, role, cycleId, guardianOnly)
            onChange({ role: keep ? value.role : '', cycleId })
          }}
        >
          {scopes.map((cycleId) => (
            <option key={cycleId ?? WHOLE_SCHOOL} value={cycleId ?? WHOLE_SCHOOL}>
              {cycleId === null
                ? t('usersAdmin.wholeSchool')
                : (cycles.find((cycle) => cycle.id === cycleId)?.name ?? cycleId)}
            </option>
          ))}
        </NativeSelect>
      </div>
      {error !== undefined && (
        <p id={`${id}-error`} className="text-sm text-destructive-ink sm:col-span-2">
          {error}
        </p>
      )}
      {grantable.length === 0 && (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          {t('usersAdmin.sheet.noGrantableRole')}
        </p>
      )}
    </div>
  )
}
