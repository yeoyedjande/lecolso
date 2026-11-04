import type { components } from '@/lib/api/schema'

import type { Profile } from './api'
import { isSystemRole } from './roles'

/**
 * Règles d'accès côté interface (fonctions pures, testées) : quel espace pour quel rôle, et où rediriger.
 * Le backend reste la vraie barrière (Policies) ; ces règles n'évitent que des écrans inutilisables.
 */
export type Membership = components['schemas']['SchoolMembershipResource']
export type Role = components['schemas']['RoleAssignmentResource']['role']

/** Espaces de l'application, dans l'ordre de préférence quand plusieurs sont possibles. */
export type Space = 'gestion' | 'enseignant' | 'parent'

/**
 * Accueil de chaque espace dans un établissement (routage par chemin, ADR 0005) : `/{slug}/tableau-de-bord`,
 * `/{slug}/enseignant`, `/{slug}/parent`. `$school` est le slug de l'école, jamais son UUID.
 */
export const SPACE_HOME = {
  gestion: '/$school/tableau-de-bord',
  enseignant: '/$school/enseignant',
  parent: '/$school/parent',
} as const satisfies Record<Space, string>

/** Rôles système du personnel administratif : back-office. */
const BACK_OFFICE_ROLES: ReadonlySet<Role> = new Set([
  'promoter',
  'director',
  'secretary',
  'accountant',
])

/** Back-office : personnel administratif, et tout rôle personnalisé créé par l'école. */
function isBackOfficeRole(role: Role): boolean {
  return BACK_OFFICE_ROLES.has(role) || !isSystemRole(role)
}

export function spacesOf(membership: Membership): Space[] {
  const roles = new Set(membership.roles.map((assignment) => assignment.role))
  const spaces: Space[] = []
  if ([...roles].some(isBackOfficeRole)) spaces.push('gestion')
  if (roles.has('teacher')) spaces.push('enseignant')
  if (roles.has('guardian')) spaces.push('parent')
  return spaces
}

/** Établissement sélectionné, s'il fait toujours partie des écoles du profil. */
export function findMembership(profile: Profile, schoolId: string | null): Membership | null {
  if (schoolId === null) return null
  return profile.schools.find((school) => school.id === schoolId) ?? null
}

/**
 * École de l'URL parmi celles du profil (`/me` : affectations réelles). Le slug n'est qu'une adresse :
 * sans affectation dans l'école, null, que l'école existe ou non (rien à deviner).
 */
export function findMembershipBySlug(profile: Profile, slug: string): Membership | null {
  return profile.schools.find((school) => school.slug === slug) ?? null
}

/** Ce que l'écran demandé exige. */
/** `platform` : espace super-admin (/plateforme), hors établissement. */
export type Requirement = 'password' | 'schools' | 'home' | 'platform' | Space

export type RedirectTarget =
  | { to: '/mot-de-passe' }
  | { to: '/etablissements' }
  | { to: '/plateforme' }
  | { to: (typeof SPACE_HOME)[Space]; school: string }

export type Decision =
  | { kind: 'redirect'; target: RedirectTarget }
  /** École de l'URL inconnue ou sans affectation : page introuvable (même réponse dans les deux cas). */
  | { kind: 'notFound' }
  | { kind: 'allow'; membership: Membership | null }

/**
 * Décide l'accès à un écran pour un utilisateur connecté.
 * 1. Mot de passe provisoire : seul l'écran de changement de mot de passe est accessible.
 * 2. Écran d'un établissement (`/{slug}/…`) : l'école de l'URL doit être l'une des siennes, sinon page introuvable ;
 *    espace accessible si un rôle le permet, sinon redirection vers le premier espace autorisé de la même école.
 * 3. Accueil (`/`) : dernière école utilisée, sinon la seule possible, sinon l'écran de choix.
 */
export function decideAccess(input: {
  profile: Profile
  /** Slug de l'URL (écrans d'un établissement), null pour les écrans globaux. */
  slug: string | null
  /** Dernière école utilisée (accueil seulement). */
  lastSchoolId: string | null
  requirement: Requirement
}): Decision {
  const { profile, requirement } = input

  if (requirement === 'password') return { kind: 'allow', membership: null }
  if (profile.must_change_password) return redirectTo({ to: '/mot-de-passe' })
  if (requirement === 'schools') return { kind: 'allow', membership: null }
  if (requirement === 'platform') {
    if (profile.is_super_admin) return { kind: 'allow', membership: null }
    return decideAccess({ ...input, slug: null, requirement: 'home' })
  }

  if (requirement === 'home' || input.slug === null) {
    // Super-admin sans affectation dans une école : son espace est la plateforme
    if (profile.is_super_admin && profile.schools.length === 0) {
      return redirectTo({ to: '/plateforme' })
    }
    const chosen =
      findMembership(profile, input.lastSchoolId) ??
      (profile.schools.length === 1 ? profile.schools[0] : undefined)
    if (chosen === undefined) return redirectTo({ to: '/etablissements' })
    const first = spacesOf(chosen)[0]
    if (first === undefined) return redirectTo({ to: '/etablissements' })
    return redirectTo({ to: SPACE_HOME[first], school: chosen.slug })
  }

  const membership = findMembershipBySlug(profile, input.slug)
  if (membership === null) return { kind: 'notFound' }

  const spaces = spacesOf(membership)
  const first = spaces[0]
  if (first === undefined) return redirectTo({ to: '/etablissements' })
  if (!spaces.includes(requirement)) {
    return redirectTo({ to: SPACE_HOME[first], school: membership.slug })
  }

  return { kind: 'allow', membership }
}

function redirectTo(target: RedirectTarget): Decision {
  return { kind: 'redirect', target }
}

/** Permission détenue dans l'établissement (sur au moins un cycle). */
export function can(membership: Membership | null, permission: string): boolean {
  if (membership === null) return false
  return Object.hasOwn(membership.permissions, permission)
}
