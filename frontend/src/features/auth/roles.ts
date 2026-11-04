import { useTranslation } from 'react-i18next'

import type { Membership } from './access'

/** Rôles système (mêmes clés que l'énumération Role du backend, hors super-admin). */
export const SYSTEM_ROLES = [
  'promoter',
  'director',
  'secretary',
  'accountant',
  'teacher',
  'guardian',
] as const

export type SystemRole = (typeof SYSTEM_ROLES)[number]

/** Rôle système, ou rôle personnalisé de l'école (sa clé est alors son identifiant). */
export function isSystemRole(role: string): role is SystemRole {
  return SYSTEM_ROLES.some((system) => system === role)
}

export interface RoleRef {
  role: string
  /** Nom du rôle personnalisé (null pour un rôle système). */
  name: string | null
}

/** Rôles distincts de l'utilisateur dans un établissement, dans l'ordre de ses affectations. */
export function distinctRoles(membership: Membership): RoleRef[] {
  const roles = new Map<string, RoleRef>()
  for (const assignment of membership.roles) {
    if (!roles.has(assignment.role)) {
      roles.set(assignment.role, { role: assignment.role, name: assignment.role_name })
    }
  }
  return [...roles.values()]
}

/** Libellé d'un rôle : traduction pour un rôle système, nom choisi par l'école pour un rôle personnalisé. */
export function useRoleLabel(): (role: RoleRef) => string {
  const { t } = useTranslation()
  return ({ role, name }) => (isSystemRole(role) ? t(`roles.${role}`) : (name ?? t('roles.custom')))
}
