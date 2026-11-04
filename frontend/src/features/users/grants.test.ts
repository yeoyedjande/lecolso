import { describe, expect, it } from 'vitest'

import type { SchoolRole } from '@/features/roles/api'
import { membership } from '@/test/profiles'

import { canGrantRole, defaultScope, holds, isPromoter } from './grants'

function role(key: string, permissions: string[]): SchoolRole {
  return {
    key,
    name: null,
    description: null,
    is_system: true,
    is_editable: false,
    permissions,
    assignments_count: 0,
  }
}

const guardianOnly = new Set(['billing.pay', 'attendance.justify'])
const teacher = role('teacher', ['students.view', 'grades.manage'])
const director = role('director', ['students.view', 'users.manage'])
const guardian = role('guardian', ['students.view', 'billing.pay'])
const treasurer = role('c0de', ['billing.view', 'subscription.pay'])

const directorOfSchool = membership({
  roles: [{ role: 'director', role_name: null, cycle_id: null }],
  permissions: {
    'students.view': null,
    'grades.manage': null,
    'users.manage': null,
    'billing.view': null,
  },
})

const kindergartenDirector = membership({
  roles: [{ role: 'director', role_name: null, cycle_id: 'cycle-k' }],
  permissions: {
    'students.view': ['cycle-k'],
    'grades.manage': ['cycle-k'],
    'users.manage': ['cycle-k'],
  },
})

const promoter = membership({
  roles: [{ role: 'promoter', role_name: null, cycle_id: null }],
  permissions: { 'users.manage': null, 'subscription.pay': null },
})

describe('canGrantRole (mêmes règles que UserPolicy::grantRole)', () => {
  it('direction : rôles du personnel et Parent, jamais Promoteur ni Direction', () => {
    expect(canGrantRole(directorOfSchool, teacher, null, guardianOnly)).toBe(true)
    // Permissions propres aux parents : pas d'élévation
    expect(canGrantRole(directorOfSchool, guardian, null, guardianOnly)).toBe(true)
    expect(canGrantRole(directorOfSchool, director, null, guardianOnly)).toBe(false)
    // Pas d'élévation : subscription.pay n'est pas détenue
    expect(canGrantRole(directorOfSchool, treasurer, null, guardianOnly)).toBe(false)
  })

  it('direction de cycle : seulement sur son cycle', () => {
    expect(canGrantRole(kindergartenDirector, teacher, 'cycle-k', guardianOnly)).toBe(true)
    expect(canGrantRole(kindergartenDirector, teacher, 'cycle-p', guardianOnly)).toBe(false)
    expect(canGrantRole(kindergartenDirector, teacher, null, guardianOnly)).toBe(false)
  })

  it('promoteur : tout rôle, y compris Direction', () => {
    expect(isPromoter(promoter)).toBe(true)
    expect(canGrantRole(promoter, director, null, guardianOnly)).toBe(true)
    expect(canGrantRole(promoter, teacher, 'cycle-k', guardianOnly)).toBe(true)
  })
})

describe('holds / defaultScope', () => {
  it('permission sur un cycle ou sur toute l’école', () => {
    expect(holds(kindergartenDirector, 'users.manage', 'cycle-k')).toBe(true)
    expect(holds(kindergartenDirector, 'users.manage', null)).toBe(false)
    expect(holds(directorOfSchool, 'users.manage', 'cycle-p')).toBe(true)
  })

  it('périmètre proposé : toute l’école si on la gère, sinon son premier cycle', () => {
    expect(defaultScope(null)).toEqual({ role: '', cycleId: null })
    expect(defaultScope(['cycle-k'])).toEqual({ role: '', cycleId: 'cycle-k' })
  })
})
