import { describe, expect, it } from 'vitest'

import { membership, profile } from '@/test/profiles'

import { can, decideAccess, findMembershipBySlug, spacesOf } from './access'

const schoolB = membership({
  id: 'school-b',
  name: 'École Les Petits Génies',
  slug: 'petits-genies',
})

describe('spacesOf', () => {
  it.each([
    [['promoter'], ['gestion']],
    [['director'], ['gestion']],
    [['secretary'], ['gestion']],
    [['accountant'], ['gestion']],
    [['teacher'], ['enseignant']],
    [['guardian'], ['parent']],
    [
      ['director', 'teacher', 'guardian'],
      ['gestion', 'enseignant', 'parent'],
    ],
    // Rôle personnalisé de l'école (clé = identifiant) : back-office
    [['0195f000-0000-7000-8000-00000000c0de'], ['gestion']],
    [
      ['0195f000-0000-7000-8000-00000000c0de', 'guardian'],
      ['gestion', 'parent'],
    ],
  ] as const)('%j → %j', (roles, spaces) => {
    expect(
      spacesOf(
        membership({ roles: roles.map((role) => ({ role, role_name: null, cycle_id: null })) }),
      ),
    ).toEqual(spaces)
  })
})

describe('decideAccess : écrans d’un établissement (/{slug}/…)', () => {
  const inSchool = (slug: string) => ({ slug, lastSchoolId: null }) as const

  it('mot de passe provisoire : tout mène au changement de mot de passe, sauf cet écran', () => {
    const user = profile({ must_change_password: true })
    expect(
      decideAccess({ ...inSchool('les-lauriers'), profile: user, requirement: 'gestion' }),
    ).toEqual({
      kind: 'redirect',
      target: { to: '/mot-de-passe' },
    })
    expect(
      decideAccess({ ...inSchool('les-lauriers'), profile: user, requirement: 'schools' }),
    ).toEqual({
      kind: 'redirect',
      target: { to: '/mot-de-passe' },
    })
    expect(
      decideAccess({ ...inSchool('les-lauriers'), profile: user, requirement: 'password' }).kind,
    ).toBe('allow')
  })

  it('école de l’URL parmi les siennes : accès, cette école devient celle de l’onglet', () => {
    const user = profile({ schools: [membership(), schoolB] })
    expect(
      decideAccess({ ...inSchool('petits-genies'), profile: user, requirement: 'gestion' }),
    ).toEqual({
      kind: 'allow',
      membership: schoolB,
    })
  })

  it('école où l’utilisateur n’a aucune affectation : introuvable (le slug n’autorise rien)', () => {
    expect(
      decideAccess({ ...inSchool('petits-genies'), profile: profile(), requirement: 'gestion' }),
    ).toEqual({ kind: 'notFound' })
  })

  it('slug inconnu : même réponse qu’une école sans affectation (rien à deviner)', () => {
    expect(
      decideAccess({ ...inSchool('ecole-inconnue'), profile: profile(), requirement: 'parent' }),
    ).toEqual({ kind: 'notFound' })
  })

  it('la dernière école de l’onglet ne remplace jamais celle de l’URL', () => {
    const user = profile({ schools: [membership()] })
    expect(
      decideAccess({
        profile: user,
        slug: 'petits-genies',
        lastSchoolId: 'school-a',
        requirement: 'gestion',
      }),
    ).toEqual({ kind: 'notFound' })
  })

  it('super-admin : aucun accès implicite aux écoles sans affectation', () => {
    const admin = profile({ is_super_admin: true, schools: [] })
    expect(
      decideAccess({ ...inSchool('les-lauriers'), profile: admin, requirement: 'gestion' }),
    ).toEqual({ kind: 'notFound' })
  })

  it('espace non autorisé : premier espace permis dans la même école', () => {
    const teacher = profile({
      schools: [membership({ roles: [{ role: 'teacher', role_name: null, cycle_id: 'cycle-1' }] })],
    })
    expect(
      decideAccess({ ...inSchool('les-lauriers'), profile: teacher, requirement: 'gestion' }),
    ).toEqual({
      kind: 'redirect',
      target: { to: '/$school/enseignant', school: 'les-lauriers' },
    })
    expect(
      decideAccess({ ...inSchool('les-lauriers'), profile: teacher, requirement: 'enseignant' })
        .kind,
    ).toBe('allow')
  })

  it('aucun rôle dans l’établissement : écran de choix', () => {
    const none = profile({ schools: [membership({ roles: [] })] })
    expect(
      decideAccess({ ...inSchool('les-lauriers'), profile: none, requirement: 'gestion' }),
    ).toEqual({ kind: 'redirect', target: { to: '/etablissements' } })
  })
})

describe('decideAccess : accueil (/)', () => {
  const home = (lastSchoolId: string | null) =>
    ({ slug: null, lastSchoolId, requirement: 'home' }) as const

  it('un seul établissement : son tableau de bord', () => {
    expect(decideAccess({ ...home(null), profile: profile() })).toEqual({
      kind: 'redirect',
      target: { to: '/$school/tableau-de-bord', school: 'les-lauriers' },
    })
  })

  it('plusieurs établissements : la dernière école utilisée, sinon l’écran de choix', () => {
    const user = profile({ schools: [membership(), schoolB] })
    expect(decideAccess({ ...home('school-b'), profile: user })).toEqual({
      kind: 'redirect',
      target: { to: '/$school/tableau-de-bord', school: 'petits-genies' },
    })
    expect(decideAccess({ ...home(null), profile: user })).toEqual({
      kind: 'redirect',
      target: { to: '/etablissements' },
    })
  })

  it('dernière école qui n’est plus dans le profil : ignorée', () => {
    const user = profile({ schools: [membership(), schoolB] })
    expect(decideAccess({ ...home('school-z'), profile: user })).toEqual({
      kind: 'redirect',
      target: { to: '/etablissements' },
    })
  })

  it('premier espace dans l’ordre gestion, enseignant, parent', () => {
    const both = profile({
      schools: [
        membership({
          roles: [
            { role: 'guardian', role_name: null, cycle_id: null },
            { role: 'teacher', role_name: null, cycle_id: null },
          ],
        }),
      ],
    })
    expect(decideAccess({ ...home('school-a'), profile: both })).toEqual({
      kind: 'redirect',
      target: { to: '/$school/enseignant', school: 'les-lauriers' },
    })
  })

  it('aucun rôle dans l’établissement : écran de choix', () => {
    const none = profile({ schools: [membership({ roles: [] })] })
    expect(decideAccess({ ...home('school-a'), profile: none })).toEqual({
      kind: 'redirect',
      target: { to: '/etablissements' },
    })
  })
})

describe('findMembershipBySlug', () => {
  it('ne retrouve que les écoles du profil', () => {
    const user = profile({ schools: [membership(), schoolB] })
    expect(findMembershipBySlug(user, 'petits-genies')).toEqual(schoolB)
    expect(findMembershipBySlug(user, 'autre-ecole')).toBeNull()
  })
})

describe('can', () => {
  it('permission présente (toute l’école ou un cycle)', () => {
    const school = membership({
      permissions: { 'grades.view': ['cycle-1'], 'students.view': null },
    })
    expect(can(school, 'grades.view')).toBe(true)
    expect(can(school, 'students.view')).toBe(true)
    expect(can(school, 'billing.manage')).toBe(false)
    expect(can(null, 'students.view')).toBe(false)
  })

  it('liste de permissions : l’une d’elles suffit', () => {
    const secretary = membership({ permissions: { 'users.reset_password': null } })
    expect(can(secretary, ['users.view', 'users.reset_password'])).toBe(true)
    expect(can(secretary, ['users.view', 'roles.manage'])).toBe(false)
  })
})

describe('espace plateforme (super-admin)', () => {
  it('super-admin sans école : accueil = plateforme ; plateforme autorisée', () => {
    const admin = profile({ is_super_admin: true, schools: [] })
    expect(
      decideAccess({ profile: admin, lastSchoolId: null, slug: null, requirement: 'home' }),
    ).toEqual({ kind: 'redirect', target: { to: '/plateforme' } })
    expect(
      decideAccess({ profile: admin, lastSchoolId: null, slug: null, requirement: 'platform' })
        .kind,
    ).toBe('allow')
  })

  it('utilisateur ordinaire : la plateforme le renvoie vers son espace', () => {
    expect(
      decideAccess({
        profile: profile(),
        lastSchoolId: 'school-a',
        slug: null,
        requirement: 'platform',
      }),
    ).toEqual({
      kind: 'redirect',
      target: { to: '/$school/tableau-de-bord', school: 'les-lauriers' },
    })
  })

  it('mot de passe provisoire : même un super-admin doit d’abord le changer', () => {
    const admin = profile({ is_super_admin: true, schools: [], must_change_password: true })
    expect(
      decideAccess({ profile: admin, lastSchoolId: null, slug: null, requirement: 'platform' }),
    ).toEqual({
      kind: 'redirect',
      target: { to: '/mot-de-passe' },
    })
  })
})
