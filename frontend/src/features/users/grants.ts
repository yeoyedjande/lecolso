import type { Membership } from '@/features/auth/access'
import type { SchoolRole } from '@/features/roles/api'

/**
 * Règles d'attribution des rôles côté interface (le backend reste la vraie barrière, UserPolicy::grantRole) :
 * - users.manage sur le cycle visé (null = toute l'école) ;
 * - Promoteur et Direction : par un promoteur de toute l'école seulement ;
 * - pas d'élévation : chaque permission du rôle détenue sur ce cycle (sauf promoteur, et permissions propres aux
 *   parents, qui ne valent que pour leurs enfants).
 */
const PROMOTER_ONLY = new Set(['promoter', 'director'])

export function isPromoter(membership: Membership | null): boolean {
  return (
    membership?.roles.some(
      (assignment) => assignment.role === 'promoter' && assignment.cycle_id === null,
    ) ?? false
  )
}

/** Permission détenue sur ce cycle (null : sur toute l'école). */
export function holds(membership: Membership | null, permission: string, cycleId: string | null) {
  const scope = membership?.permissions[permission]
  if (scope === undefined) return false
  return scope === null || (cycleId !== null && scope.includes(cycleId))
}

/** Cycles sur lesquels on peut attribuer des rôles : null = toute l'école (et chacun de ses cycles). */
export function manageableCycles(membership: Membership | null): string[] | null | undefined {
  return membership?.permissions['users.manage']
}

export function canGrantRole(
  membership: Membership | null,
  role: SchoolRole,
  cycleId: string | null,
  guardianOnly: ReadonlySet<string>,
): boolean {
  if (!holds(membership, 'users.manage', cycleId)) return false
  const promoter = isPromoter(membership)
  if (PROMOTER_ONLY.has(role.key) && !promoter) return false
  if (promoter) return true
  return role.permissions.every(
    (permission) => guardianOnly.has(permission) || holds(membership, permission, cycleId),
  )
}

export interface RoleScope {
  role: string
  cycleId: string | null
}

/** Périmètre proposé par défaut : toute l'école si on la gère, sinon son premier cycle. */
export function defaultScope(scope: string[] | null | undefined): RoleScope {
  return { role: '', cycleId: scope === null || scope === undefined ? null : (scope[0] ?? null) }
}
