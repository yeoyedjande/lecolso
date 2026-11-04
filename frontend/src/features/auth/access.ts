import type { components } from '@/lib/api/schema'

import type { Profile } from './api'

/**
 * Règles d'accès côté interface (fonctions pures, testées) : quel espace pour quel rôle, et où rediriger.
 * Le backend reste la vraie barrière (Policies) ; ces règles n'évitent que des écrans inutilisables.
 */
export type Membership = components['schemas']['SchoolMembershipResource']
export type Role = components['schemas']['RoleAssignmentResource']['role']

/** Espaces de l'application, dans l'ordre de préférence quand plusieurs sont possibles. */
export type Space = 'gestion' | 'enseignant' | 'parent'

export const SPACE_PATHS = {
  gestion: '/gestion',
  enseignant: '/enseignant',
  parent: '/parent',
} as const satisfies Record<Space, string>

/** Rôles du personnel administratif : back-office. */
const BACK_OFFICE_ROLES: ReadonlySet<Role> = new Set([
  'promoter',
  'director',
  'secretary',
  'accountant',
])

export function spacesOf(membership: Membership): Space[] {
  const roles = new Set(membership.roles.map((assignment) => assignment.role))
  const spaces: Space[] = []
  if ([...roles].some((role) => BACK_OFFICE_ROLES.has(role))) spaces.push('gestion')
  if (roles.has('teacher')) spaces.push('enseignant')
  if (roles.has('guardian')) spaces.push('parent')
  return spaces
}

/** Établissement sélectionné, s'il fait toujours partie des écoles du profil. */
export function findMembership(profile: Profile, schoolId: string | null): Membership | null {
  if (schoolId === null) return null
  return profile.schools.find((school) => school.id === schoolId) ?? null
}

/** Sur `<slug>.<domaine>`, le slug de l'école ; sur `app.<domaine>`, en local ou sans domaine : null. */
export function slugFromHost(hostname: string, tenantDomain: string | null): string | null {
  if (tenantDomain === null) return null
  const suffix = `.${tenantDomain}`
  if (!hostname.endsWith(suffix)) return null
  const slug = hostname.slice(0, -suffix.length)
  if (slug === '' || slug.includes('.') || ['app', 'www', 'api'].includes(slug)) return null
  return slug
}

/** Ce que l'écran demandé exige. */
/** `platform` : espace super-admin (/plateforme), hors établissement. */
export type Requirement = 'password' | 'schools' | 'home' | 'platform' | Space

/** `selectSchoolId` : établissement choisi automatiquement, à mémoriser avant de continuer. */
export type RedirectTarget =
  '/mot-de-passe' | '/etablissements' | '/plateforme' | (typeof SPACE_PATHS)[Space]

export type Decision =
  | { kind: 'redirect'; to: RedirectTarget; selectSchoolId?: string }
  | { kind: 'allow'; membership: Membership | null; selectSchoolId?: string }

/**
 * Décide l'accès à un écran pour un utilisateur connecté.
 * 1. Mot de passe provisoire : seul l'écran de changement de mot de passe est accessible.
 * 2. Établissement : celui déjà choisi, sinon celui du sous-domaine, sinon le seul possible, sinon l'écran de choix.
 * 3. Espace : accessible si un rôle le permet, sinon redirection vers le premier espace autorisé.
 */
export function decideAccess(input: {
  profile: Profile
  schoolId: string | null
  slug: string | null
  requirement: Requirement
}): Decision {
  const { profile, requirement } = input

  if (requirement === 'password') return { kind: 'allow', membership: null }
  if (profile.must_change_password) return { kind: 'redirect', to: '/mot-de-passe' }
  if (requirement === 'schools') return { kind: 'allow', membership: null }
  if (requirement === 'platform') {
    if (profile.is_super_admin) return { kind: 'allow', membership: null }
    return decideAccess({ ...input, requirement: 'home' })
  }
  // Super-admin sans affectation dans une école : son espace est la plateforme
  if (profile.is_super_admin && profile.schools.length === 0)
    return { kind: 'redirect', to: '/plateforme' }

  let membership = findMembership(profile, input.schoolId)
  const select: { selectSchoolId?: string } = {}

  if (membership === null) {
    const bySlug =
      input.slug !== null ? profile.schools.find((school) => school.slug === input.slug) : undefined
    const chosen = bySlug ?? (profile.schools.length === 1 ? profile.schools[0] : undefined)
    if (chosen === undefined) return { kind: 'redirect', to: '/etablissements' }
    membership = chosen
    select.selectSchoolId = chosen.id
  }

  const spaces = spacesOf(membership)
  const first = spaces[0]
  if (first === undefined) return { kind: 'redirect', to: '/etablissements' }

  if (requirement === 'home' || !spaces.includes(requirement)) {
    return { kind: 'redirect', to: SPACE_PATHS[first], ...select }
  }

  return { kind: 'allow', membership, ...select }
}

/** Permission détenue dans l'établissement (sur au moins un cycle). */
export function can(membership: Membership | null, permission: string): boolean {
  if (membership === null) return false
  return Object.hasOwn(membership.permissions, permission)
}
