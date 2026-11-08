import type { Membership } from '@/features/auth/access'

import type { Permission } from './api'

/** Ordre d'affichage des modules ; un module inconnu (ajouté côté API) vient en dernier. */
const GROUP_ORDER: readonly string[] = [
  'school',
  'students',
  'billing',
  'grades',
  'attendance',
  'messaging',
  'users',
  'roles',
  'subscription',
]

export interface PermissionGroup {
  group: string
  permissions: string[]
}

/** Permissions du personnel regroupées par module (celles réservées aux parents sont exclues). */
export function groupPermissions(catalog: readonly Permission[]): PermissionGroup[] {
  const groups = new Map<string, string[]>()
  for (const permission of catalog) {
    if (!permission.staff_assignable) continue
    const list = groups.get(permission.group) ?? []
    list.push(permission.key)
    groups.set(permission.group, list)
  }
  const rank = (group: string) => {
    const index = GROUP_ORDER.indexOf(group)
    return index === -1 ? GROUP_ORDER.length : index
  }
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([group, permissions]) => ({ group, permissions }))
}

/**
 * Peut-on cocher cette permission ? Seulement si on la détient soi-même sur toute l'école (même règle que l'API :
 * pas d'élévation). Une permission déjà présente dans le rôle peut toujours être conservée ou retirée.
 */
export function canGrant(membership: Membership | null, permission: string): boolean {
  return membership !== null && membership.permissions[permission] === null
}
