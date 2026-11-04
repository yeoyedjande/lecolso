import { describe, expect, it } from 'vitest'

import { membership, profile } from '@/test/profiles'

import { can, decideAccess, slugFromHost, spacesOf } from './access'

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
  ] as const)('%j → %j', (roles, spaces) => {
    expect(
      spacesOf(membership({ roles: roles.map((role) => ({ role, cycle_id: null })) })),
    ).toEqual(spaces)
  })
})

describe('decideAccess', () => {
  const base = { schoolId: null, slug: null } as const

  it('mot de passe provisoire : tout mène au changement de mot de passe, sauf cet écran', () => {
    const user = profile({ must_change_password: true })
    expect(decideAccess({ ...base, profile: user, requirement: 'gestion' })).toEqual({
      kind: 'redirect',
      to: '/mot-de-passe',
    })
    expect(decideAccess({ ...base, profile: user, requirement: 'schools' })).toEqual({
      kind: 'redirect',
      to: '/mot-de-passe',
    })
    expect(decideAccess({ ...base, profile: user, requirement: 'password' }).kind).toBe('allow')
  })

  it('un seul établissement : choisi automatiquement', () => {
    expect(decideAccess({ ...base, profile: profile(), requirement: 'gestion' })).toEqual({
      kind: 'allow',
      membership: membership(),
      selectSchoolId: 'school-a',
    })
  })

  it('plusieurs établissements sans choix : écran de choix', () => {
    const user = profile({ schools: [membership(), schoolB] })
    expect(decideAccess({ ...base, profile: user, requirement: 'gestion' })).toEqual({
      kind: 'redirect',
      to: '/etablissements',
    })
  })

  it('sous-domaine de l’école : établissement présélectionné', () => {
    const user = profile({ schools: [membership(), schoolB] })
    expect(
      decideAccess({ profile: user, schoolId: null, slug: 'petits-genies', requirement: 'home' }),
    ).toEqual({
      kind: 'redirect',
      to: '/gestion',
      selectSchoolId: 'school-b',
    })
  })

  it('établissement mémorisé qui n’est plus dans le profil : ignoré', () => {
    const user = profile({ schools: [membership(), schoolB] })
    expect(
      decideAccess({ profile: user, schoolId: 'school-z', slug: null, requirement: 'gestion' }),
    ).toEqual({
      kind: 'redirect',
      to: '/etablissements',
    })
  })

  it('espace non autorisé : redirection vers le premier espace permis', () => {
    const teacher = profile({
      schools: [membership({ roles: [{ role: 'teacher', cycle_id: 'cycle-1' }] })],
    })
    expect(
      decideAccess({ profile: teacher, schoolId: 'school-a', slug: null, requirement: 'gestion' }),
    ).toEqual({
      kind: 'redirect',
      to: '/enseignant',
    })
    expect(
      decideAccess({
        profile: teacher,
        schoolId: 'school-a',
        slug: null,
        requirement: 'enseignant',
      }).kind,
    ).toBe('allow')
  })

  it('accueil : premier espace dans l’ordre gestion, enseignant, parent', () => {
    const both = profile({
      schools: [
        membership({
          roles: [
            { role: 'guardian', cycle_id: null },
            { role: 'teacher', cycle_id: null },
          ],
        }),
      ],
    })
    expect(
      decideAccess({ profile: both, schoolId: 'school-a', slug: null, requirement: 'home' }),
    ).toEqual({
      kind: 'redirect',
      to: '/enseignant',
    })
  })

  it('aucun rôle dans l’établissement : écran de choix', () => {
    const none = profile({ schools: [membership({ roles: [] })] })
    expect(
      decideAccess({ profile: none, schoolId: 'school-a', slug: null, requirement: 'home' }),
    ).toEqual({
      kind: 'redirect',
      to: '/etablissements',
    })
  })
})

describe('slugFromHost', () => {
  it.each([
    ['les-lauriers.lecolso.ci', 'lecolso.ci', 'les-lauriers'],
    ['app.lecolso.ci', 'lecolso.ci', null],
    ['www.lecolso.ci', 'lecolso.ci', null],
    ['lecolso.ci', 'lecolso.ci', null],
    ['a.b.lecolso.ci', 'lecolso.ci', null],
    ['les-lauriers.autre.ci', 'lecolso.ci', null],
    ['localhost', null, null],
  ])('%s (domaine %s) → %s', (host, domain, slug) => {
    expect(slugFromHost(host, domain)).toBe(slug)
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
})

describe('espace plateforme (super-admin)', () => {
  it('super-admin sans école : accueil = plateforme ; plateforme autorisée', () => {
    const admin = profile({ is_super_admin: true, schools: [] })
    expect(
      decideAccess({ profile: admin, schoolId: null, slug: null, requirement: 'home' }),
    ).toEqual({ kind: 'redirect', to: '/plateforme' })
    expect(
      decideAccess({ profile: admin, schoolId: null, slug: null, requirement: 'platform' }).kind,
    ).toBe('allow')
  })

  it('utilisateur ordinaire : la plateforme le renvoie vers son espace', () => {
    expect(
      decideAccess({
        profile: profile(),
        schoolId: 'school-a',
        slug: null,
        requirement: 'platform',
      }),
    ).toEqual({
      kind: 'redirect',
      to: '/gestion',
    })
  })

  it('mot de passe provisoire : même un super-admin doit d’abord le changer', () => {
    const admin = profile({ is_super_admin: true, schools: [], must_change_password: true })
    expect(
      decideAccess({ profile: admin, schoolId: null, slug: null, requirement: 'platform' }),
    ).toEqual({
      kind: 'redirect',
      to: '/mot-de-passe',
    })
  })
})
