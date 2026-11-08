import { describe, expect, it } from 'vitest'

import { membership } from '@/test/profiles'

import type { Permission } from './api'
import { canGrant, groupPermissions } from './permissions'

const catalog: Permission[] = [
  { key: 'users.manage', group: 'users', staff_assignable: true },
  { key: 'students.view', group: 'students', staff_assignable: true },
  { key: 'billing.pay', group: 'billing', staff_assignable: false },
  { key: 'billing.manage', group: 'billing', staff_assignable: true },
  { key: 'library.lend', group: 'library', staff_assignable: true },
  { key: 'school.settings.view', group: 'school', staff_assignable: true },
]

describe('groupPermissions', () => {
  it('groupe par module dans l’ordre de l’écran, sans les permissions des parents', () => {
    expect(groupPermissions(catalog)).toEqual([
      { group: 'school', permissions: ['school.settings.view'] },
      { group: 'students', permissions: ['students.view'] },
      { group: 'billing', permissions: ['billing.manage'] },
      { group: 'users', permissions: ['users.manage'] },
      // Module inconnu de l'interface (ajouté côté API) : en dernier, jamais perdu
      { group: 'library', permissions: ['library.lend'] },
    ])
  })
})

describe('canGrant', () => {
  it('seulement une permission détenue sur toute l’école (pas d’élévation)', () => {
    const director = membership({
      permissions: { 'students.view': null, 'grades.validate': ['cycle-1'] },
    })

    expect(canGrant(director, 'students.view')).toBe(true)
    // Détenue sur un seul cycle : pas sur toute l'école
    expect(canGrant(director, 'grades.validate')).toBe(false)
    expect(canGrant(director, 'subscription.pay')).toBe(false)
    expect(canGrant(null, 'students.view')).toBe(false)
  })
})
