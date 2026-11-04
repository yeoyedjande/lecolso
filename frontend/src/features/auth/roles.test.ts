import { describe, expect, it } from 'vitest'

import { membership } from '@/test/profiles'

import { distinctRoles, isSystemRole } from './roles'

describe('isSystemRole', () => {
  it.each([
    ['director', true],
    ['guardian', true],
    ['super_admin', false],
    ['0195f000-0000-7000-8000-00000000c0de', false],
  ])('%s → %s', (role, expected) => {
    expect(isSystemRole(role)).toBe(expected)
  })
})

describe('distinctRoles', () => {
  it('un rôle une seule fois, même affecté sur plusieurs cycles, avec le nom d’un rôle personnalisé', () => {
    const school = membership({
      roles: [
        { role: 'teacher', role_name: null, cycle_id: 'cycle-1' },
        { role: 'teacher', role_name: null, cycle_id: 'cycle-2' },
        { role: 'role-1', role_name: 'Surveillant général', cycle_id: null },
      ],
    })

    expect(distinctRoles(school)).toEqual([
      { role: 'teacher', name: null },
      { role: 'role-1', name: 'Surveillant général' },
    ])
  })
})
