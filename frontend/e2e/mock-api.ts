import type { Page, Route } from '@playwright/test'
import { z } from 'zod'

import { E2E_API_URL } from './api.ts'

/**
 * API simulée (page.route) reprenant le contrat OpenAPI et les comptes du seeder de démonstration
 * (backend/database/seeders/DemoSeeder.php). Mot de passe commun : Demo2026!.
 */
export const DEMO_PASSWORD = 'Demo2026!'

type Role = 'promoter' | 'director' | 'secretary' | 'accountant' | 'teacher' | 'guardian'

export const SCHOOLS = {
  lauriers: {
    id: '0195f000-0000-7000-8000-000000000001',
    name: 'Les Lauriers',
    slug: 'les-lauriers',
  },
  genies: {
    id: '0195f000-0000-7000-8000-000000000002',
    name: 'Petits Génies',
    slug: 'petits-genies',
  },
} as const

const CYCLE_PRIMARY = '0195f000-0000-7000-8000-0000000000c3'

/** Cycles du catalogue (backend/config/cycles.php), mêmes paramètres par défaut. */
const CYCLES = [
  {
    id: '0195f000-0000-7000-8000-0000000000c1',
    code: 'daycare',
    name: 'Garderie',
    position: 1,
    is_active: true,
    settings: {
      term_type: 'free_period',
      assessment_mode: 'observation',
      attendance_mode: 'check_in_out',
      billing_period: 'monthly',
      report_document: 'none',
      daily_log: 'required',
    },
    levels: [{ id: 'l1', code: 'CRECHE', name: 'Crèche', position: 1 }],
  },
  {
    id: '0195f000-0000-7000-8000-0000000000c2',
    code: 'kindergarten',
    name: 'Maternelle',
    position: 2,
    is_active: true,
    settings: {
      term_type: 'free_period',
      assessment_mode: 'competency',
      attendance_mode: 'roll_call',
      billing_period: 'quarterly',
      report_document: 'skills_booklet',
      daily_log: 'optional',
    },
    levels: [
      { id: 'l2', code: 'PS', name: 'Petite section', position: 1 },
      { id: 'l3', code: 'MS', name: 'Moyenne section', position: 2 },
      { id: 'l4', code: 'GS', name: 'Grande section', position: 3 },
    ],
  },
  {
    id: CYCLE_PRIMARY,
    code: 'primary',
    name: 'Primaire',
    position: 3,
    is_active: true,
    settings: {
      term_type: 'trimester',
      assessment_mode: 'weighted_average',
      attendance_mode: 'roll_call',
      billing_period: 'quarterly',
      report_document: 'report_card',
      daily_log: 'none',
    },
    levels: ['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'].map((code, index) => ({
      id: `l${String(index + 5)}`,
      code,
      name: code,
      position: index + 1,
    })),
  },
]

/** Même catalogue et même ordre que backend/config/permissions.php (permissions par défaut des rôles système). */
const PERMISSIONS: Record<string, Role[]> = {
  'school.settings.view': ['promoter', 'director', 'secretary'],
  'school.settings.manage': ['promoter', 'director'],
  'students.view': ['promoter', 'director', 'secretary', 'accountant', 'teacher', 'guardian'],
  'students.manage': ['director', 'secretary'],
  'billing.view': ['promoter', 'director', 'secretary', 'accountant', 'guardian'],
  'billing.manage': ['director', 'accountant'],
  'billing.pay': ['guardian'],
  'grades.view': ['promoter', 'director', 'secretary', 'teacher', 'guardian'],
  'grades.manage': ['director', 'teacher'],
  'grades.validate': ['director'],
  'attendance.view': ['promoter', 'director', 'secretary', 'teacher', 'guardian'],
  'attendance.manage': ['director', 'secretary', 'teacher'],
  'attendance.justify': ['guardian'],
  'messaging.send': ['promoter', 'director', 'secretary', 'accountant', 'teacher', 'guardian'],
  'subscription.view': ['promoter', 'director'],
  'subscription.pay': ['promoter'],
  'users.reset_password': ['director', 'secretary'],
  'users.view': ['promoter', 'director'],
  'users.manage': ['promoter', 'director'],
  'roles.manage': ['promoter', 'director'],
}

const SYSTEM_ROLE_KEYS: Role[] = [
  'promoter',
  'director',
  'secretary',
  'accountant',
  'teacher',
  'guardian',
]
const EDITABLE_SYSTEM_ROLES: Role[] = ['secretary', 'accountant']
const GUARDIAN_ONLY = ['billing.pay', 'attendance.justify']

interface MockRole {
  key: string
  name: string | null
  description: string | null
  is_system: boolean
  is_editable: boolean
  permissions: string[]
  assignments_count: number
}

interface Assignment {
  school: keyof typeof SCHOOLS
  role: Role
  cycle?: string
}

export interface Account {
  phone: string
  name: string
  email: string
  roles: Assignment[]
  mustChangePassword?: boolean
  superAdmin?: boolean
}

export const ACCOUNTS = {
  /** Super-admin sans affectation dans une école (espace /plateforme). */
  superAdmin: {
    phone: '+2250700000001',
    name: 'Super-admin Démo',
    email: 'superadmin@demo.ekalewa.com',
    roles: [],
    superAdmin: true,
  },
  promoter: {
    phone: '+2250700000002',
    name: 'Konan Promoteur',
    email: 'promoteur@demo.ekalewa.com',
    roles: [
      { school: 'lauriers', role: 'promoter' },
      { school: 'genies', role: 'promoter' },
    ],
  },
  director: {
    phone: '+2250700000003',
    name: 'Yao Directeur',
    email: 'directeur@demo.ekalewa.com',
    roles: [{ school: 'lauriers', role: 'director' }],
  },
  /** Directrice limitée à la maternelle (affectation avec cycle). */
  kindergartenDirector: {
    phone: '+2250700000004',
    name: 'Aminata Directrice maternelle',
    email: 'directrice.maternelle@demo.ekalewa.com',
    roles: [
      { school: 'lauriers', role: 'director', cycle: '0195f000-0000-7000-8000-0000000000c2' },
    ],
  },
  accountant: {
    phone: '+2250700000006',
    name: 'Moussa Comptable',
    email: 'comptable@demo.ekalewa.com',
    roles: [{ school: 'lauriers', role: 'accountant' }],
  },
  teacher: {
    phone: '+2250700000007',
    name: 'Fatou Enseignante',
    email: 'enseignante@demo.ekalewa.com',
    roles: [{ school: 'lauriers', role: 'teacher', cycle: CYCLE_PRIMARY }],
  },
  guardian: {
    phone: '+2250700000008',
    name: 'Kouadio Parent',
    email: 'parent@demo.ekalewa.com',
    roles: [
      { school: 'lauriers', role: 'guardian' },
      { school: 'genies', role: 'guardian' },
    ],
  },
  /** Compte créé par la direction avec un mot de passe provisoire. */
  provisional: {
    phone: '+2250700000010',
    name: 'Adjoua Secrétaire',
    email: 'nouvelle@demo.ekalewa.com',
    roles: [{ school: 'lauriers', role: 'secretary' }],
    mustChangePassword: true,
  },
} satisfies Record<string, Account>

function profileOf(account: Account, mustChangePassword: boolean) {
  const bySchool = new Map<keyof typeof SCHOOLS, Assignment[]>()
  for (const assignment of account.roles) {
    bySchool.set(assignment.school, [...(bySchool.get(assignment.school) ?? []), assignment])
  }
  const staff = account.roles.some((assignment) => assignment.role !== 'guardian')

  return {
    id: '0195f000-0000-7000-8000-0000000000aa',
    name: account.name,
    phone: account.phone,
    email: account.email,
    must_change_password: mustChangePassword,
    is_super_admin: account.superAdmin === true,
    can_be_remembered: !staff,
    schools: [...bySchool].map(([key, assignments]) => {
      const roles = assignments.map((assignment) => ({
        role: assignment.role,
        role_name: null,
        cycle_id: assignment.cycle ?? null,
      }))
      const permissions: Record<string, string[] | null> = {}
      for (const [permission, holders] of Object.entries(PERMISSIONS)) {
        const matching = assignments.filter((assignment) => holders.includes(assignment.role))
        if (matching.length === 0) continue
        permissions[permission] = matching.some((assignment) => assignment.cycle === undefined)
          ? null
          : matching.map((assignment) => assignment.cycle ?? '')
      }
      return { ...SCHOOLS[key], roles, permissions }
    }),
  }
}

function normalize(login: string): string {
  const value = login.trim()
  if (value.includes('@')) return value.toLowerCase()
  const digits = value.replace(/[\s.-]/g, '')
  return /^0\d{9}$/.test(digits) ? `+225${digits}` : digits
}

export interface MockApi {
  /** Nombre d'appels reçus par route (« POST /auth/login »). */
  calls: Map<string, number>
  /** En-têtes X-School-Id reçus, dans l'ordre (contrôle d'isolation entre écoles). */
  schoolHeaders: string[]
  /** Session expirée côté serveur : toute requête suivante répond 401. */
  expireSession: () => void
}

/**
 * Installe l'API simulée. `session` : compte déjà connecté (sinon 401 sur /me jusqu'à la connexion).
 * `throttleAfter` : 429 au-delà de N tentatives de connexion échouées.
 */
export async function mockApi(
  page: Page,
  options: { session?: Account; throttleAfter?: number } = {},
): Promise<MockApi> {
  let current: Account | null = options.session ?? null
  let mustChange = current?.mustChangePassword ?? false
  let failures = 0
  const calls = new Map<string, number>()
  const schoolHeaders: string[] = []
  interface MockSchool {
    id: string
    organization_id: null
    name: string
    slug: string
    type: string
    city: string | null
    currency: string
    created_at: string
  }
  const platformSchools: MockSchool[] = Object.values(SCHOOLS).map((school, index) => ({
    id: school.id,
    organization_id: null,
    name: school.name,
    slug: school.slug,
    type: 'preschool_primary',
    city: 'Abidjan',
    currency: 'XOF',
    created_at: `2026-0${String(index + 7)}-01T08:00:00+00:00`,
  }))
  const origin = new URL(E2E_API_URL).origin
  // Rôles personnalisés et ajustements des rôles système, par école (comme la table school_roles)
  const customRoles = new Map<string, MockRole[]>()
  const overrides = new Map<string, Map<string, string[]>>()
  let roleCounter = 0
  const schoolKeyOf = (schoolId: string) =>
    (['lauriers', 'genies'] satisfies (keyof typeof SCHOOLS)[]).find(
      (key) => SCHOOLS[key].id === schoolId,
    )
  const rolesOf = (schoolId: string): MockRole[] => {
    const schoolKey = schoolKeyOf(schoolId)
    const accounts: Account[] = Object.values(ACCOUNTS)
    const count = (role: string) =>
      accounts.reduce(
        (sum, account) =>
          sum +
          account.roles.filter(
            (assignment) => assignment.school === schoolKey && assignment.role === role,
          ).length,
        0,
      )
    const system = SYSTEM_ROLE_KEYS.map((key) => ({
      key,
      name: null,
      description: null,
      is_system: true,
      is_editable: EDITABLE_SYSTEM_ROLES.includes(key),
      permissions:
        overrides.get(schoolId)?.get(key) ??
        Object.keys(PERMISSIONS).filter((permission) => PERMISSIONS[permission]?.includes(key)),
      assignments_count: count(key),
    }))
    return [...system, ...(customRoles.get(schoolId) ?? [])]
  }
  /** Permissions de l'utilisateur connecté sur toute l'école (règle d'élévation de l'API). */
  const heldSchoolWide = (schoolId: string): string[] => {
    const schoolKey = schoolKeyOf(schoolId)
    const roles = (current?.roles ?? []).filter(
      (assignment) => assignment.school === schoolKey && assignment.cycle === undefined,
    )
    return Object.keys(PERMISSIONS).filter((permission) =>
      roles.some((assignment) => PERMISSIONS[permission]?.includes(assignment.role)),
    )
  }
  const roleBody = z.object({
    name: z.optional(z.string()),
    description: z.optional(z.nullable(z.string())),
    permissions: z.optional(z.array(z.string())),
  })
  const permissionErrors = (
    schoolId: string,
    permissions: string[],
    currentPermissions: string[],
  ) => {
    const unknown = permissions.findIndex(
      (permission) => !(permission in PERMISSIONS) || GUARDIAN_ONLY.includes(permission),
    )
    if (unknown !== -1) return { [`permissions.${String(unknown)}`]: ['Permission refusée.'] }
    const held = heldSchoolWide(schoolId)
    const notHeld = permissions.filter(
      (permission) => !currentPermissions.includes(permission) && !held.includes(permission),
    )
    return notHeld.length === 0
      ? null
      : {
          permissions: [
            `Vous ne pouvez accorder que des permissions que vous détenez vous-même sur toute l’école : ${notHeld.join(', ')}.`,
          ],
        }
  }
  // Comptes de l'école (GET/POST /users…) : initialisés depuis ACCOUNTS, modifiés par les écritures
  interface MockUserRole {
    id: string
    role: string
    role_name: string | null
    cycle_id: string | null
  }
  interface MockUser {
    id: string
    name: string
    phone: string
    email: string | null
    active: boolean
    must_change_password: boolean
    last_login_at: string | null
    roles: MockUserRole[]
  }
  const userId = (phone: string) => `0195f000-0000-7000-8000-${phone.slice(-12)}`
  let assignmentCounter = 0
  const nextAssignment = () => {
    assignmentCounter += 1
    return `0195f000-0000-7000-8000-0000000a${String(assignmentCounter).padStart(4, '0')}`
  }
  const schoolUsers = new Map<string, MockUser[]>()
  const usersOf = (schoolId: string): MockUser[] => {
    const existing = schoolUsers.get(schoolId)
    if (existing !== undefined) return existing
    const schoolKey = schoolKeyOf(schoolId)
    const accounts: Account[] = Object.values(ACCOUNTS)
    const users = accounts
      .filter((account) => account.roles.some((assignment) => assignment.school === schoolKey))
      .map((account): MockUser => ({
        id: userId(account.phone),
        name: account.name,
        phone: account.phone,
        email: account.email,
        active: true,
        must_change_password: account.mustChangePassword ?? false,
        last_login_at: '2026-11-03T08:15:00+00:00',
        roles: account.roles
          .filter((assignment) => assignment.school === schoolKey)
          .map((assignment) => ({
            id: nextAssignment(),
            role: assignment.role,
            role_name: null,
            cycle_id: assignment.cycle ?? null,
          })),
      }))
    schoolUsers.set(schoolId, users)
    return users
  }
  /** Comme UserPolicy::manage, simplifié : jamais soi-même ; promoteur seulement par un promoteur. */
  const canManage = (schoolId: string, user: MockUser) => {
    if (current === null || user.phone === current.phone) return false
    const schoolKey = schoolKeyOf(schoolId)
    const mine = current.roles.filter((assignment) => assignment.school === schoolKey)
    const promoter = mine.some((assignment) => assignment.role === 'promoter')
    if (user.roles.some((assignment) => assignment.role === 'promoter') && !promoter) return false
    return mine.some(
      (assignment) => PERMISSIONS['users.manage']?.includes(assignment.role) === true,
    )
  }
  const present = (schoolId: string, user: MockUser) => ({
    ...user,
    can_manage: canManage(schoolId, user),
  })
  // Identité des écoles (GET/PATCH /school, logo) : modifiée par les écritures, lue aussi par la page publique
  interface MockSchoolProfile {
    name: string
    city: string | null
    address: string | null
    phone: string | null
    email: string | null
    motto: string | null
    logo_url: string | null
  }
  const profiles = new Map<string, MockSchoolProfile>()
  const schoolProfileOf = (schoolId: string): MockSchoolProfile => {
    const existing = profiles.get(schoolId)
    if (existing !== undefined) return existing
    const schoolKey = schoolKeyOf(schoolId) ?? 'lauriers'
    const profile: MockSchoolProfile = {
      name: SCHOOLS[schoolKey].name,
      city: 'Abidjan',
      address: schoolKey === 'lauriers' ? 'Cocody Angré, 8e tranche, Abidjan' : null,
      phone: schoolKey === 'lauriers' ? '+2252722410000' : null,
      email: schoolKey === 'lauriers' ? 'contact@leslauriers.ci' : null,
      motto: schoolKey === 'lauriers' ? 'Grandir, apprendre, s’épanouir' : null,
      logo_url: null,
    }
    profiles.set(schoolId, profile)
    return profile
  }
  const schoolResource = (schoolId: string) => {
    const schoolKey = schoolKeyOf(schoolId) ?? 'lauriers'
    return {
      id: schoolId,
      slug: SCHOOLS[schoolKey].slug,
      type: 'preschool_primary',
      currency: 'XOF',
      ...schoolProfileOf(schoolId),
    }
  }
  /** Comme SchoolPolicy::update : paramètres de l'école sur toute l'école. */
  const canEditSchool = (schoolId: string) => {
    const schoolKey = schoolKeyOf(schoolId)
    return (
      current?.roles.some(
        (assignment) =>
          assignment.school === schoolKey &&
          assignment.cycle === undefined &&
          PERMISSIONS['school.settings.manage']?.includes(assignment.role) === true,
      ) ?? false
    )
  }
  const ordered = (permissions: string[]) =>
    Object.keys(PERMISSIONS).filter((permission) => permissions.includes(permission))

  await page.route(`${origin}/sanctum/csrf-cookie`, (route) => route.fulfill({ status: 204 }))

  await page.route(`${E2E_API_URL}/**`, async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const key = `${request.method()} ${path}`
    calls.set(key, (calls.get(key) ?? 0) + 1)

    // Comme auth:sanctum : sans session (jamais connecté ou session expirée), 401 hors routes publiques
    const anonymousAllowed =
      key === 'GET /me' ||
      key === 'POST /auth/login' ||
      key === 'GET /health' ||
      path.startsWith('/public/')
    if (current === null && !anonymousAllowed) {
      return route.fulfill({ status: 401, json: { message: 'Unauthenticated.' } })
    }

    // Comme ResolveSchool : école sans affectation pour le compte connecté = 404 (rien à deviner)
    // (routes hors école comme /me, /auth/*, /health, /public/* : pas de ResolveSchool, l'en-tête est ignoré)
    const schoolHeader = request.headers()['x-school-id']
    if (schoolHeader !== undefined && !anonymousAllowed) {
      schoolHeaders.push(schoolHeader)
      const member =
        current?.roles.some((role) => SCHOOLS[role.school].id === schoolHeader) ?? false
      if (!member) return route.fulfill({ status: 404, json: { message: 'Not Found' } })
    }

    switch (key) {
      case 'GET /cycles': {
        // Petits Génies : garderie et maternelle seulement
        const genies = request.headers()['x-school-id'] === SCHOOLS.genies.id
        return route.fulfill({ json: { data: genies ? CYCLES.slice(0, 2) : CYCLES } })
      }
      case 'GET /health':
        return route.fulfill({ json: { status: 'ok', database: 'ok', redis: 'ok' } })
      case 'GET /me':
        return current === null
          ? route.fulfill({ status: 401, json: { message: 'Unauthenticated.' } })
          : route.fulfill({ json: { data: profileOf(current, mustChange) } })
      case 'POST /auth/login': {
        const body = z
          .object({ login: z.string(), password: z.string() })
          .parse(request.postDataJSON())
        if (options.throttleAfter !== undefined && failures >= options.throttleAfter) {
          return route.fulfill({
            status: 429,
            json: { message: 'Trop de tentatives.', code: 'too_many_attempts' },
          })
        }
        const accounts: Account[] = Object.values(ACCOUNTS)
        const account = accounts.find(
          (candidate) =>
            candidate.phone === normalize(body.login) || candidate.email === normalize(body.login),
        )
        if (account === undefined || body.password !== DEMO_PASSWORD) {
          failures += 1
          return route.fulfill({
            status: 422,
            json: {
              message: 'Identifiant ou mot de passe incorrect.',
              errors: { login: ['Identifiant ou mot de passe incorrect.'] },
            },
          })
        }
        current = account
        mustChange = account.mustChangePassword ?? false
        return route.fulfill({ json: { data: profileOf(account, mustChange) } })
      }
      case 'POST /auth/password': {
        const body = z.object({ current_password: z.string() }).parse(request.postDataJSON())
        if (body.current_password !== DEMO_PASSWORD) {
          return route.fulfill({
            status: 422,
            json: {
              message: 'Le mot de passe est incorrect.',
              errors: { current_password: ['Le mot de passe est incorrect.'] },
            },
          })
        }
        mustChange = false
        return route.fulfill({ status: 204 })
      }
      case 'POST /auth/logout':
        current = null
        return route.fulfill({ status: 204 })
      case 'GET /platform/schools':
        return current?.superAdmin !== true
          ? route.fulfill({ status: 404, json: { message: 'Not Found' } })
          : route.fulfill({
              json: {
                data: platformSchools,
                links: {},
                meta: { next_cursor: null, prev_cursor: null, per_page: 50, path: '' },
              },
            })
      case 'POST /platform/schools': {
        if (current?.superAdmin !== true)
          return route.fulfill({ status: 404, json: { message: 'Not Found' } })
        const body = z
          .object({
            name: z.string(),
            slug: z.string(),
            city: z.nullable(z.string()),
            director: z.object({ name: z.string(), phone: z.string() }),
          })
          .parse(request.postDataJSON())
        if (platformSchools.some((school) => school.slug === body.slug)) {
          return route.fulfill({
            status: 422,
            json: {
              message: 'Cette adresse est déjà utilisée.',
              errors: { slug: ['Cette adresse est déjà utilisée par une autre école.'] },
            },
          })
        }
        const school = {
          id: `0195f000-0000-7000-8000-00000000010${String(platformSchools.length)}`,
          organization_id: null,
          name: body.name,
          slug: body.slug,
          type: 'preschool_primary',
          city: body.city,
          currency: 'XOF',
          created_at: '2026-11-04T09:30:00+00:00',
        }
        platformSchools.push(school)
        return route.fulfill({
          status: 201,
          json: {
            data: school,
            director: {
              id: '0195f000-0000-7000-8000-0000000000d1',
              name: body.director.name,
              phone: body.director.phone,
              provisional_password: 'k7Pm2xQa9R',
            },
          },
        })
      }
      case 'GET /school':
        return route.fulfill({ json: { data: schoolResource(schoolHeader ?? '') } })
      case 'PATCH /school': {
        const schoolId = schoolHeader ?? ''
        if (!canEditSchool(schoolId)) {
          return route.fulfill({ status: 403, json: { message: 'This action is unauthorized.' } })
        }
        const body = z.record(z.string(), z.nullable(z.string())).parse(request.postDataJSON())
        const profile = schoolProfileOf(schoolId)
        if (body.phone !== undefined && body.phone !== null && body.phone !== '') {
          // Comme Support\Phone\Phone : tout numéro ivoirien à 10 chiffres (fixe ou mobile)
          const digits = body.phone.replace(/[\s.-]/g, '')
          body.phone = /^\d{10}$/.test(digits) ? `+225${digits}` : digits
        }
        for (const field of ['name', 'city', 'address', 'phone', 'email', 'motto'] as const) {
          const value = body[field]
          if (value === undefined) continue
          if (field === 'name') profile.name = value ?? profile.name
          else profile[field] = value === null || value === '' ? null : value
        }
        return route.fulfill({ json: { data: schoolResource(schoolId) } })
      }
      case 'POST /school/logo': {
        const schoolId = schoolHeader ?? ''
        if (!canEditSchool(schoolId)) {
          return route.fulfill({ status: 403, json: { message: 'This action is unauthorized.' } })
        }
        // Image de test (1 × 1, orange) : l'API réelle renverrait une URL signée de lecture
        schoolProfileOf(schoolId).logo_url =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg=='
        return route.fulfill({ json: { data: schoolResource(schoolId) } })
      }
      case 'DELETE /school/logo': {
        const schoolId = schoolHeader ?? ''
        if (!canEditSchool(schoolId)) {
          return route.fulfill({ status: 403, json: { message: 'This action is unauthorized.' } })
        }
        schoolProfileOf(schoolId).logo_url = null
        return route.fulfill({ json: { data: schoolResource(schoolId) } })
      }
      case 'GET /users': {
        const schoolId = schoolHeader ?? ''
        const query = new URL(request.url()).searchParams
        const search = (query.get('search') ?? '').toLowerCase()
        const role = query.get('role')
        const status = query.get('status') ?? 'all'
        const data = usersOf(schoolId)
          .filter((user) => search === '' || user.name.toLowerCase().includes(search))
          .filter(
            (user) => role === null || user.roles.some((assignment) => assignment.role === role),
          )
          .filter((user) => status === 'all' || user.active === (status === 'active'))
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
          .map((user) => present(schoolId, user))
        return route.fulfill({
          json: {
            data,
            links: { first: null, last: null, prev: null, next: null },
            meta: { path: '', per_page: 25, next_cursor: null, prev_cursor: null },
          },
        })
      }
      case 'POST /users': {
        const schoolId = schoolHeader ?? ''
        const body = z
          .object({
            name: z.string(),
            phone: z.string(),
            email: z.nullable(z.string()),
            roles: z.array(z.object({ role: z.string(), cycle_id: z.nullable(z.string()) })),
          })
          .parse(request.postDataJSON())
        const phone = normalize(body.phone)
        if (usersOf(schoolId).some((user) => user.phone === phone)) {
          return route.fulfill({
            status: 422,
            json: {
              message: 'Ce numéro appartient déjà à un compte de l’établissement.',
              errors: { phone: ['Ce numéro appartient déjà à un compte de l’établissement.'] },
            },
          })
        }
        const user: MockUser = {
          id: userId(phone),
          name: body.name.trim(),
          phone,
          email: body.email,
          active: true,
          must_change_password: true,
          last_login_at: null,
          roles: body.roles.map((assignment) => ({
            id: nextAssignment(),
            role: assignment.role,
            role_name: null,
            cycle_id: assignment.cycle_id,
          })),
        }
        usersOf(schoolId).push(user)
        return route.fulfill({
          status: 201,
          json: { data: present(schoolId, user), provisional_password: 'k7Pm2xQa9R' },
        })
      }
      case 'GET /permissions':
        return route.fulfill({
          json: {
            data: Object.keys(PERMISSIONS).map((key) => ({
              key,
              group: key.split('.')[0],
              staff_assignable: !GUARDIAN_ONLY.includes(key),
            })),
          },
        })
      case 'GET /roles':
        return route.fulfill({ json: { data: rolesOf(schoolHeader ?? '') } })
      case 'POST /roles': {
        const schoolId = schoolHeader ?? ''
        const body = roleBody.parse(request.postDataJSON())
        const name = (body.name ?? '').trim()
        const list = customRoles.get(schoolId) ?? []
        if (list.some((role) => role.name?.toLowerCase() === name.toLowerCase())) {
          return route.fulfill({
            status: 422,
            json: {
              message: 'Un rôle porte déjà ce nom dans l’école.',
              errors: { name: ['Un rôle porte déjà ce nom dans l’école.'] },
            },
          })
        }
        const errors = permissionErrors(schoolId, body.permissions ?? [], [])
        if (errors !== null)
          return route.fulfill({ status: 422, json: { message: 'Permissions refusées.', errors } })
        roleCounter += 1
        const role: MockRole = {
          key: `0195f000-0000-7000-8000-00000000c0${String(roleCounter).padStart(2, '0')}`,
          name,
          description: body.description ?? null,
          is_system: false,
          is_editable: true,
          permissions: ordered(body.permissions ?? []),
          assignments_count: 0,
        }
        customRoles.set(schoolId, [...list, role])
        return route.fulfill({ status: 201, json: { data: role } })
      }
      default:
        if (path.startsWith('/users/')) {
          const schoolId = schoolHeader ?? ''
          const [, , id = '', action = '', assignmentId = ''] = path.split('/')
          const users = usersOf(schoolId)
          const user = users.find((candidate) => candidate.id === id)
          if (user === undefined)
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          const method = request.method()
          if (method === 'POST' && action === 'password-reset') {
            return route.fulfill({ json: { provisional_password: 'Zq4mT8wPa2' } })
          }
          if (method === 'GET' && action === '')
            return route.fulfill({ json: { data: present(schoolId, user) } })
          if (!canManage(schoolId, user)) {
            return route.fulfill({ status: 403, json: { message: 'This action is unauthorized.' } })
          }
          if (method === 'PATCH' && action === '') {
            const body = z
              .object({
                name: z.optional(z.string()),
                phone: z.optional(z.string()),
                email: z.optional(z.nullable(z.string())),
              })
              .parse(request.postDataJSON())
            if (body.name !== undefined) user.name = body.name
            if (body.phone !== undefined) user.phone = normalize(body.phone)
            if (body.email !== undefined) user.email = body.email
            return route.fulfill({ json: { data: present(schoolId, user) } })
          }
          if (method === 'POST' && (action === 'deactivate' || action === 'reactivate')) {
            user.active = action === 'reactivate'
            return route.fulfill({ json: { data: present(schoolId, user) } })
          }
          if (method === 'POST' && action === 'roles') {
            const body = z
              .object({ role: z.string(), cycle_id: z.nullable(z.string()) })
              .parse(request.postDataJSON())
            user.roles.push({
              id: nextAssignment(),
              role: body.role,
              role_name: null,
              cycle_id: body.cycle_id,
            })
            return route.fulfill({ json: { data: present(schoolId, user) } })
          }
          if (method === 'DELETE' && action === 'roles') {
            if (user.roles.length <= 1) {
              return route.fulfill({
                status: 409,
                json: { message: 'C’est le dernier rôle de ce compte.', code: 'last_role' },
              })
            }
            user.roles = user.roles.filter((assignment) => assignment.id !== assignmentId)
            return route.fulfill({ json: { data: present(schoolId, user) } })
          }
          if (method === 'DELETE' && action === '') {
            schoolUsers.set(
              schoolId,
              users.filter((candidate) => candidate.id !== id),
            )
            return route.fulfill({ json: { erased: true } })
          }
        }
        if (
          path.startsWith('/roles/') &&
          (request.method() === 'PATCH' || request.method() === 'DELETE')
        ) {
          const schoolId = schoolHeader ?? ''
          const key = path.slice('/roles/'.length)
          const role = rolesOf(schoolId).find((candidate) => candidate.key === key)
          if (role === undefined)
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          if (request.method() === 'DELETE') {
            if (role.is_system)
              return route.fulfill({
                status: 409,
                json: {
                  message: 'Un rôle système ne peut pas être supprimé.',
                  code: 'role_locked',
                },
              })
            customRoles.set(
              schoolId,
              (customRoles.get(schoolId) ?? []).filter((candidate) => candidate.key !== key),
            )
            return route.fulfill({ status: 204 })
          }
          if (!role.is_editable)
            return route.fulfill({
              status: 409,
              json: { message: 'Ce rôle système ne peut pas être modifié.', code: 'role_locked' },
            })
          const body = roleBody.parse(request.postDataJSON())
          if (body.permissions !== undefined) {
            const errors = permissionErrors(schoolId, body.permissions, role.permissions)
            if (errors !== null)
              return route.fulfill({
                status: 422,
                json: { message: 'Permissions refusées.', errors },
              })
          }
          const updated: MockRole = {
            ...role,
            name: role.is_system ? null : (body.name?.trim() ?? role.name),
            description: role.is_system
              ? null
              : body.description === undefined
                ? role.description
                : body.description,
            permissions:
              body.permissions === undefined ? role.permissions : ordered(body.permissions),
          }
          if (role.is_system) {
            const map = overrides.get(schoolId) ?? new Map<string, string[]>()
            map.set(key, updated.permissions)
            overrides.set(schoolId, map)
          } else {
            customRoles.set(
              schoolId,
              (customRoles.get(schoolId) ?? []).map((candidate) =>
                candidate.key === key ? updated : candidate,
              ),
            )
          }
          return route.fulfill({ json: { data: updated } })
        }
        if (request.method() === 'GET' && path.startsWith('/public/schools/')) {
          const slug = path.slice('/public/schools/'.length)
          const school = Object.values(SCHOOLS).find((candidate) => candidate.slug === slug)
          if (school === undefined)
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          const cycles = (slug === 'petits-genies' ? CYCLES.slice(0, 2) : CYCLES).map((cycle) => ({
            code: cycle.code,
            name: cycle.name,
            levels: cycle.levels.map((level) => level.name),
          }))
          return route.fulfill({
            json: {
              data: {
                slug: school.slug,
                type: 'preschool_primary',
                ...(({ name, city, address, phone, email, motto, logo_url }) => ({
                  name,
                  city,
                  address,
                  phone,
                  email,
                  motto,
                  logo_url,
                }))(schoolProfileOf(school.id)),
                cycles,
              },
            },
          })
        }
        if (request.method() === 'PATCH' && path.startsWith('/cycles/')) {
          const cycle = CYCLES.find((candidate) => path.endsWith(candidate.id))
          const body = z.object({ name: z.optional(z.string()) }).parse(request.postDataJSON())
          return cycle === undefined
            ? route.fulfill({ status: 404, json: { message: 'Not Found' } })
            : route.fulfill({ json: { data: { ...cycle, name: body.name ?? cycle.name } } })
        }
        return route.fulfill({ status: 404, json: { message: 'Not Found' } })
    }
  })

  return {
    calls,
    schoolHeaders,
    expireSession: () => {
      current = null
    },
  }
}
