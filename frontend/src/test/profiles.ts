import type { Membership } from '@/features/auth/access'
import type { Profile } from '@/features/auth/api'

/** Profils de test (même forme que GET /me). */
export function membership(overrides: Partial<Membership> = {}): Membership {
  return {
    id: 'school-a',
    name: 'Groupe scolaire Les Lauriers',
    slug: 'les-lauriers',
    roles: [{ role: 'director', role_name: null, cycle_id: null }],
    permissions: { 'students.view': null, 'billing.manage': null },
    ...overrides,
  }
}

export function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-1',
    name: 'Yao Directeur',
    phone: '+2250700000003',
    email: 'directeur@demo.ekalewa.com',
    must_change_password: false,
    is_super_admin: false,
    can_be_remembered: false,
    schools: [membership()],
    ...overrides,
  }
}
