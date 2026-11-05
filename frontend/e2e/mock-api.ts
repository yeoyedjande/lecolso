import type { Page, Route } from '@playwright/test'
import { z } from 'zod'

import { E2E_API_URL } from './api.ts'

/**
 * API simulée (page.route) reprenant le contrat OpenAPI et les comptes du seeder de démonstration
 * (backend/database/seeders/DemoSeeder.php). Mot de passe commun : Demo2026!.
 */
export const DEMO_PASSWORD = 'Demo2026!'

/** Identifiant d'un élève de démonstration des Lauriers d'après son numéro de matricule (LAU-000001 → 1). */
export function lauriersStudentId(number: number): string {
  return `0195f000-0000-7000-8000-1${String(number).padStart(11, '0')}`
}

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
  'students.medical.view': ['director', 'secretary', 'teacher', 'guardian'],
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
    code: string
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
      code: schoolKey === 'lauriers' ? 'LAU' : 'PGE',
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
      code_locked: studentsOf(schoolId).length > 0,
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
  // Années scolaires et classes (comme le DemoSeeder : 2025-2026 clôturée, 2026-2027 en cours)
  interface MockYear {
    id: string
    label: string
    starts_on: string
    ends_on: string
    status: 'open' | 'closed'
    is_current: boolean
  }
  interface MockClassroom {
    id: string
    academic_year_id: string
    level_id: string
    section: string
    capacity: number | null
    room: string | null
    homeroom_teacher_id: string | null
  }
  const SEEDED_CLASSROOMS: Record<string, [string, string[]][]> = {
    lauriers: [
      ['CRECHE', ['A']],
      ['PS', ['A']],
      ['MS', ['A']],
      ['GS', ['A']],
      ['CP1', ['A']],
      ['CP2', ['A']],
      ['CE1', ['A', 'B']],
      ['CE2', ['A']],
      ['CM1', ['A']],
      ['CM2', ['A']],
    ],
    genies: [
      ['CRECHE', ['A', 'B']],
      ['PS', ['A', 'B']],
      ['MS', ['A']],
      ['GS', ['A']],
    ],
  }
  const HOMEROOM = ['CE1 A', 'CM1 A']
  let academicCounter = 0
  const nextAcademicId = () => {
    academicCounter += 1
    return `0195f000-0000-7000-8000-0000000b${String(academicCounter).padStart(4, '0')}`
  }
  const cyclesOf = (schoolId: string) =>
    schoolId === SCHOOLS.genies.id ? CYCLES.slice(0, 2) : CYCLES
  const levelOf = (schoolId: string, levelId: string) => {
    for (const cycle of cyclesOf(schoolId)) {
      const level = cycle.levels.find((candidate) => candidate.id === levelId)
      if (level !== undefined) return { level, cycle }
    }
    return undefined
  }
  const schoolYears = new Map<string, MockYear[]>()
  const schoolClassrooms = new Map<string, MockClassroom[]>()
  const yearsOf = (schoolId: string): MockYear[] => {
    const existing = schoolYears.get(schoolId)
    if (existing !== undefined) return existing
    const years: MockYear[] = [
      {
        id: nextAcademicId(),
        label: '2026-2027',
        starts_on: '2026-09-07',
        ends_on: '2027-07-16',
        status: 'open',
        is_current: true,
      },
      {
        id: nextAcademicId(),
        label: '2025-2026',
        starts_on: '2025-09-08',
        ends_on: '2026-07-17',
        status: 'closed',
        is_current: false,
      },
    ]
    schoolYears.set(schoolId, years)
    return years
  }
  const classroomsOf = (schoolId: string): MockClassroom[] => {
    const existing = schoolClassrooms.get(schoolId)
    if (existing !== undefined) return existing
    const year = yearsOf(schoolId).find((candidate) => candidate.label === '2026-2027')
    const schoolKey = schoolKeyOf(schoolId)
    const classrooms: MockClassroom[] = []
    for (const [code, sections] of schoolKey === undefined
      ? []
      : (SEEDED_CLASSROOMS[schoolKey] ?? [])) {
      const level = cyclesOf(schoolId)
        .flatMap((cycle) => cycle.levels)
        .find((candidate) => candidate.code === code)
      if (level === undefined || year === undefined) continue
      for (const section of sections) {
        classrooms.push({
          id: nextAcademicId(),
          academic_year_id: year.id,
          level_id: level.id,
          section,
          capacity: 35,
          room: null,
          homeroom_teacher_id:
            schoolKey === 'lauriers' && HOMEROOM.includes(`${code} ${section}`)
              ? userId(ACCOUNTS.teacher.phone)
              : null,
        })
      }
    }
    schoolClassrooms.set(schoolId, classrooms)
    return classrooms
  }
  /** Comme Authorizer : la permission sur toute l'école, ou sur le cycle donné. */
  const holds = (schoolId: string, permission: string, cycleId: string | null) => {
    const schoolKey = schoolKeyOf(schoolId)
    return (
      current?.roles.some(
        (assignment) =>
          assignment.school === schoolKey &&
          (assignment.cycle === undefined || assignment.cycle === cycleId) &&
          PERMISSIONS[permission]?.includes(assignment.role) === true,
      ) ?? false
    )
  }
  const classroomResource = (schoolId: string, classroom: MockClassroom) => {
    const found = levelOf(schoolId, classroom.level_id)
    const teacher = usersOf(schoolId).find((user) => user.id === classroom.homeroom_teacher_id)
    return {
      id: classroom.id,
      academic_year_id: classroom.academic_year_id,
      name: `${found?.level.code ?? '?'} ${classroom.section}`,
      section: classroom.section,
      capacity: classroom.capacity,
      enrolled_count: takenSeats(schoolId, classroom.id),
      room: classroom.room,
      level: {
        id: classroom.level_id,
        code: found?.level.code ?? '',
        name: found?.level.name ?? '',
        cycle_id: found?.cycle.id ?? '',
        cycle_code: found?.cycle.code ?? '',
      },
      homeroom_teacher: teacher === undefined ? null : { id: teacher.id, name: teacher.name },
      can_manage: holds(schoolId, 'school.settings.manage', found?.cycle.id ?? null),
    }
  }
  const yearBody = z.object({
    label: z.optional(z.string()),
    starts_on: z.optional(z.string()),
    ends_on: z.optional(z.string()),
    status: z.optional(z.enum(['open', 'closed'])),
    is_current: z.optional(z.boolean()),
  })
  /** Comme SaveAcademicYear : unicité du libellé, une seule année en cours, pas de clôture de l'année en cours. */
  const saveYear = (schoolId: string, year: MockYear | null, body: z.infer<typeof yearBody>) => {
    const years = yearsOf(schoolId)
    const label = body.label ?? year?.label ?? ''
    if (years.some((candidate) => candidate.label === label && candidate !== year)) {
      return {
        status: 422,
        json: {
          message: 'Libellé déjà utilisé.',
          errors: { label: ['Cette année scolaire existe déjà.'] },
        },
      }
    }
    const target = year ?? {
      id: nextAcademicId(),
      label,
      starts_on: '',
      ends_on: '',
      status: 'open' as const,
      is_current: false,
    }
    const closing = body.status === 'closed' && (body.is_current ?? target.is_current)
    if (closing) {
      return { status: 409, json: { message: 'Année en cours.', code: 'current_year' } }
    }
    Object.assign(target, {
      label,
      starts_on: body.starts_on ?? target.starts_on,
      ends_on: body.ends_on ?? target.ends_on,
      status: body.status ?? target.status,
    })
    if (body.is_current === true) {
      for (const candidate of years) candidate.is_current = candidate === target
    }
    if (year === null) years.unshift(target)
    years.sort((a, b) => b.label.localeCompare(a.label))
    return { status: year === null ? 201 : 200, json: { data: target } }
  }
  const classroomBody = z.object({
    level_id: z.optional(z.string()),
    academic_year_id: z.optional(z.string()),
    section: z.optional(z.string()),
    capacity: z.optional(z.nullable(z.number())),
    room: z.optional(z.nullable(z.string())),
    homeroom_teacher_id: z.optional(z.nullable(z.string())),
  })
  const forbidden = { status: 403, json: { message: 'This action is unauthorized.' } }
  /** Comme SaveClassroom : droit sur le cycle du niveau, année ouverte, section unique. */
  const saveClassroom = (
    schoolId: string,
    classroom: MockClassroom | null,
    body: z.infer<typeof classroomBody>,
  ) => {
    const levelId = body.level_id ?? classroom?.level_id ?? ''
    const found = levelOf(schoolId, levelId)
    if (found === undefined) {
      return {
        status: 422,
        json: { message: 'Niveau inconnu.', errors: { level_id: ['Niveau inconnu.'] } },
      }
    }
    if (!holds(schoolId, 'school.settings.manage', found.cycle.id)) return forbidden
    const yearId =
      body.academic_year_id ??
      classroom?.academic_year_id ??
      yearsOf(schoolId).find((candidate) => candidate.is_current)?.id ??
      ''
    const year = yearsOf(schoolId).find((candidate) => candidate.id === yearId)
    if (year?.status !== 'open') {
      return {
        status: 422,
        json: {
          message: 'Année clôturée.',
          errors: { academic_year_id: ['Cette année scolaire est clôturée.'] },
        },
      }
    }
    const section = (body.section ?? classroom?.section ?? '').trim().toUpperCase()
    const duplicate = classroomsOf(schoolId).some(
      (candidate) =>
        candidate !== classroom &&
        candidate.academic_year_id === yearId &&
        candidate.level_id === levelId &&
        candidate.section === section,
    )
    if (duplicate) {
      return {
        status: 422,
        json: {
          message: 'Section déjà utilisée.',
          errors: { section: ['Cette classe existe déjà pour ce niveau.'] },
        },
      }
    }
    const target = classroom ?? {
      id: nextAcademicId(),
      academic_year_id: yearId,
      level_id: levelId,
      section,
      capacity: null,
      room: null,
      homeroom_teacher_id: null,
    }
    Object.assign(target, {
      level_id: levelId,
      section,
      capacity: body.capacity === undefined ? target.capacity : body.capacity,
      room: body.room === undefined ? target.room : body.room,
      homeroom_teacher_id:
        body.homeroom_teacher_id === undefined
          ? target.homeroom_teacher_id
          : body.homeroom_teacher_id,
    })
    if (classroom === null) classroomsOf(schoolId).push(target)
    return {
      status: classroom === null ? 201 : 200,
      json: { data: classroomResource(schoolId, target) },
    }
  }
  // Élèves, tuteurs et inscriptions (comme le DemoSeeder : 3 élèves par classe aux Lauriers, 2 aux Petits Génies,
  // enfants du compte parent ; matricules « LAU-000001 »)
  interface MockGuardian {
    id: string
    photo_url?: string | null
    name: string
    phone: string
    email: string | null
    profession: string | null
  }
  interface MockLink {
    guardian_id: string
    relation: 'father' | 'mother' | 'guardian' | 'other'
    is_primary_contact: boolean
    is_payer: boolean
    can_pick_up: boolean
  }
  interface MockEnrollment {
    id: string
    academic_year_id: string
    classroom_id: string
    status: 'active' | 'left'
    enrolled_on: string
    left_on: string | null
    leave_reason: string | null
  }
  interface MockStudent {
    id: string
    photo_url?: string | null
    matricule: string
    first_name: string
    last_name: string
    gender: 'F' | 'M'
    birth_date: string
    birth_place: string | null
    address: string | null
    blood_type: string | null
    allergies: string | null
    medical_notes: string | null
    links: MockLink[]
    enrollments: MockEnrollment[]
  }
  const FIRST = {
    F: ['Awa', 'Aïcha', 'Mariam', 'Fatou', 'Adjoua', 'Aya', 'Inès', 'Grâce'],
    M: ['Yao', 'Koffi', 'Ibrahim', 'Moussa', 'Kouamé', 'Didier', 'Serge', 'Ismaël'],
  }
  const LAST = [
    'Koné',
    'Traoré',
    'Bamba',
    'Kouassi',
    'Ouattara',
    'Diallo',
    'Coulibaly',
    'Touré',
    'Konan',
    'Soro',
  ]
  const GUARDIAN_CHILDREN: Record<string, [string, string, 'F' | 'M'][]> = {
    lauriers: [
      ['CE1 A', 'Ange', 'M'],
      ['CP1 A', 'Junior', 'M'],
    ],
    genies: [['MS A', 'Grâce', 'F']],
  }
  const schoolStudents = new Map<string, MockStudent[]>()
  const schoolGuardians = new Map<string, MockGuardian[]>()
  const sequences = new Map<string, number>()
  let studentCounter = 0
  const studentIdOf = (schoolKey: string, number: number) =>
    `0195f000-0000-7000-8000-${schoolKey === 'lauriers' ? '1' : '2'}${String(number).padStart(11, '0')}`
  const nextStudentId = () => {
    studentCounter += 1
    return `0195f000-0000-7000-8000-0000000c${String(studentCounter).padStart(4, '0')}`
  }
  const guardiansOf = (schoolId: string): MockGuardian[] => {
    studentsOf(schoolId)
    return schoolGuardians.get(schoolId) ?? []
  }
  const guardianByPhone = (
    schoolId: string,
    phone: string,
    name: string,
    profession: string | null,
  ) => {
    const guardians = schoolGuardians.get(schoolId) ?? []
    schoolGuardians.set(schoolId, guardians)
    const existing = guardians.find((guardian) => guardian.phone === phone)
    if (existing !== undefined) {
      existing.profession ??= profession
      return existing
    }
    const created = { id: nextStudentId(), name, phone, email: null, profession }
    guardians.push(created)
    return created
  }
  const nextMatricule = (schoolId: string) => {
    const number = (sequences.get(schoolId) ?? 0) + 1
    sequences.set(schoolId, number)
    return `${schoolProfileOf(schoolId).code}-${String(number).padStart(6, '0')}`
  }
  const studentsOf = (schoolId: string): MockStudent[] => {
    const existing = schoolStudents.get(schoolId)
    if (existing !== undefined) return existing
    const students: MockStudent[] = []
    schoolStudents.set(schoolId, students)
    const schoolKey = schoolKeyOf(schoolId) ?? 'lauriers'
    const perClass = schoolKey === 'lauriers' ? 3 : 2
    let number = 0
    for (const classroom of classroomsOf(schoolId)) {
      const name = classroomResource(schoolId, classroom).name
      const children = (GUARDIAN_CHILDREN[schoolKey] ?? []).filter(([classe]) => classe === name)
      for (let index = 0; index < perClass + children.length; index++) {
        number += 1
        const child = children[index - perClass]
        const gender = child?.[2] ?? (number % 2 === 0 ? 'M' : 'F')
        const lastName =
          child === undefined ? (LAST[(number * 7) % LAST.length] ?? 'Koné') : 'Kouadio'
        const guardian =
          child === undefined
            ? guardianByPhone(
                schoolId,
                `+2250710${String(number).padStart(6, '0')}`,
                `Mariam ${lastName}`,
                'Commerçante',
              )
            : guardianByPhone(
                schoolId,
                ACCOUNTS.guardian.phone,
                ACCOUNTS.guardian.name,
                'Enseignant',
              )
        students.push({
          // Identifiant stable dérivé du matricule (liens des tests) : LAU-000001 → …-100000000001
          id: studentIdOf(schoolKey, number),
          matricule: nextMatricule(schoolId),
          first_name: child?.[1] ?? FIRST[gender][number % FIRST[gender].length] ?? 'Awa',
          last_name: lastName,
          gender,
          birth_date: `2019-${String(1 + (number % 12)).padStart(2, '0')}-14`,
          birth_place: null,
          address: 'Cocody Angré',
          blood_type: null,
          allergies: number % 9 === 4 ? 'Arachide' : null,
          medical_notes: null,
          links: [
            {
              guardian_id: guardian.id,
              relation: child === undefined ? 'mother' : 'father',
              is_primary_contact: true,
              is_payer: true,
              can_pick_up: true,
            },
          ],
          enrollments: [
            {
              id: nextStudentId(),
              academic_year_id: classroom.academic_year_id,
              classroom_id: classroom.id,
              status: 'active',
              enrolled_on: '2026-09-14',
              left_on: null,
              leave_reason: null,
            },
          ],
        })
      }
    }
    return students
  }
  const takenSeats = (schoolId: string, classroomId: string) =>
    (
      schoolStudents.get(schoolId) ??
      (classroomsOf(schoolId).length > 0 ? studentsOf(schoolId) : [])
    )
      .flatMap((student) => student.enrollments)
      .filter(
        (enrollment) => enrollment.classroom_id === classroomId && enrollment.status === 'active',
      ).length
  const cycleOfClassroom = (schoolId: string, classroomId: string) => {
    const classroom = classroomsOf(schoolId).find((candidate) => candidate.id === classroomId)
    return classroom === undefined
      ? null
      : (levelOf(schoolId, classroom.level_id)?.cycle.id ?? null)
  }
  /** Comme StudentAccess : personnel par cycle, enseignant limité à ses classes, parent à ses enfants. */
  const canSee = (schoolId: string, student: MockStudent, permission = 'students.view') => {
    const schoolKey = schoolKeyOf(schoolId)
    return (current?.roles ?? [])
      .filter(
        (assignment) =>
          assignment.school === schoolKey &&
          PERMISSIONS[permission]?.includes(assignment.role) === true,
      )
      .some((assignment) => {
        if (assignment.role === 'guardian') {
          return student.links.some(
            (link) =>
              guardiansOf(schoolId).find((guardian) => guardian.id === link.guardian_id)?.phone ===
              current?.phone,
          )
        }
        if (assignment.role === 'teacher') {
          return student.enrollments.some(
            (enrollment) =>
              enrollment.status === 'active' &&
              classroomsOf(schoolId).find((classroom) => classroom.id === enrollment.classroom_id)
                ?.homeroom_teacher_id === userId(current?.phone ?? ''),
          )
        }
        return (
          assignment.cycle === undefined ||
          student.enrollments.some(
            (enrollment) =>
              cycleOfClassroom(schoolId, enrollment.classroom_id) === assignment.cycle,
          )
        )
      })
  }
  const latestEnrollment = (student: MockStudent) => student.enrollments[0]
  const manages = (schoolId: string, student: MockStudent) => {
    const enrollment = latestEnrollment(student)
    return holds(
      schoolId,
      'students.manage',
      enrollment === undefined ? null : cycleOfClassroom(schoolId, enrollment.classroom_id),
    )
  }
  const fullName = (student: MockStudent) =>
    `${student.last_name.toUpperCase()} ${student.first_name}`
  const guardianResource = (schoolId: string, link: MockLink) => {
    const guardian = guardiansOf(schoolId).find((candidate) => candidate.id === link.guardian_id)
    return {
      id: link.guardian_id,
      name: guardian?.name ?? '',
      phone: guardian?.phone ?? '',
      email: guardian?.email ?? null,
      profession: guardian?.profession ?? null,
      photo_url: guardian?.photo_url ?? null,
      ...link,
    }
  }
  const studentRow = (schoolId: string, student: MockStudent) => {
    const enrollment = latestEnrollment(student)
    const classroom = classroomsOf(schoolId).find(
      (candidate) => candidate.id === enrollment?.classroom_id,
    )
    const resource = classroom === undefined ? undefined : classroomResource(schoolId, classroom)
    const contact = student.links.find((link) => link.is_primary_contact) ?? student.links[0]
    const guardian = contact === undefined ? undefined : guardianResource(schoolId, contact)
    return {
      id: student.id,
      matricule: student.matricule,
      first_name: student.first_name,
      last_name: student.last_name,
      full_name: fullName(student),
      gender: student.gender,
      birth_date: student.birth_date,
      photo_url: student.photo_url ?? null,
      enrollment:
        enrollment === undefined || resource === undefined
          ? null
          : {
              id: enrollment.id,
              status: enrollment.status,
              classroom_id: resource.id,
              classroom_name: resource.name,
              cycle_id: resource.level.cycle_id,
              cycle_code: resource.level.cycle_code,
            },
      primary_contact:
        guardian === undefined ? null : { name: guardian.name, phone: guardian.phone },
    }
  }
  const studentFile = (schoolId: string, student: MockStudent) => {
    const medical = canSee(schoolId, student, 'students.medical.view')
    const guardianIds = student.links.map((link) => link.guardian_id)
    return {
      ...studentRow(schoolId, student),
      birth_place: student.birth_place,
      address: student.address,
      medical: medical
        ? {
            blood_type: student.blood_type,
            allergies: student.allergies,
            medical_notes: student.medical_notes,
          }
        : null,
      guardians: student.links.map((link) => guardianResource(schoolId, link)),
      enrollments: student.enrollments.map((enrollment) => {
        const classroom = classroomsOf(schoolId).find(
          (candidate) => candidate.id === enrollment.classroom_id,
        )
        const resource =
          classroom === undefined ? undefined : classroomResource(schoolId, classroom)
        const year = yearsOf(schoolId).find(
          (candidate) => candidate.id === enrollment.academic_year_id,
        )
        return {
          ...enrollment,
          academic_year: {
            id: year?.id ?? '',
            label: year?.label ?? '',
            is_current: year?.is_current ?? false,
            status: year?.status ?? 'open',
          },
          classroom: {
            id: resource?.id ?? '',
            name: resource?.name ?? '',
            level_code: resource?.level.code ?? '',
            cycle_id: resource?.level.cycle_id ?? '',
            cycle_code: resource?.level.cycle_code ?? '',
            homeroom_teacher: resource?.homeroom_teacher?.name ?? null,
          },
        }
      }),
      siblings: studentsOf(schoolId)
        .filter(
          (other) =>
            other !== student &&
            other.links.some((link) => guardianIds.includes(link.guardian_id)) &&
            canSee(schoolId, other),
        )
        .map((other) => ({
          id: other.id,
          full_name: fullName(other),
          photo_url: other.photo_url ?? null,
          classroom_name: studentRow(schoolId, other).enrollment?.classroom_name ?? null,
        })),
      can_manage: manages(schoolId, student),
      can_view_medical: medical,
      created_at: '2026-09-14T08:00:00+00:00',
    }
  }
  const phoneOf = (input: unknown) => {
    const digits = typeof input === 'string' ? input.replace(/[\s.-]/g, '') : ''
    return /^0[157]\d{8}$/.test(digits)
      ? `+225${digits}`
      : /^\+225\d{10}$/.test(digits)
        ? digits
        : null
  }
  const studentBody = z.object({
    first_name: z.optional(z.string()),
    last_name: z.optional(z.string()),
    gender: z.optional(z.enum(['F', 'M'])),
    birth_date: z.optional(z.string()),
    birth_place: z.optional(z.nullable(z.string())),
    address: z.optional(z.nullable(z.string())),
    blood_type: z.optional(z.nullable(z.string())),
    allergies: z.optional(z.nullable(z.string())),
    medical_notes: z.optional(z.nullable(z.string())),
  })
  const guardianBody = z.object({
    name: z.optional(z.string()),
    phone: z.optional(z.string()),
    email: z.optional(z.nullable(z.string())),
    profession: z.optional(z.nullable(z.string())),
    relation: z.optional(z.enum(['father', 'mother', 'guardian', 'other'])),
    is_primary_contact: z.optional(z.boolean()),
    is_payer: z.optional(z.boolean()),
    can_pick_up: z.optional(z.boolean()),
  })
  const MEDICAL = ['blood_type', 'allergies', 'medical_notes'] as const
  const medicalErrors = (
    schoolId: string,
    cycleId: string | null,
    body: z.infer<typeof studentBody>,
    prefix: string,
  ) =>
    holds(schoolId, 'students.medical.view', cycleId)
      ? null
      : Object.fromEntries(
          MEDICAL.filter((field) => body[field] !== undefined).map((field) => [
            `${prefix}${field}`,
            ['Champ interdit.'],
          ]),
        )
  const applyStudent = (student: MockStudent, body: z.infer<typeof studentBody>) => {
    for (const field of ['first_name', 'last_name', 'birth_date'] as const) {
      const value = body[field]
      if (value !== undefined) student[field] = value.trim()
    }
    if (body.gender !== undefined) student.gender = body.gender
    for (const field of [
      'birth_place',
      'address',
      'blood_type',
      'allergies',
      'medical_notes',
    ] as const) {
      const value = body[field]
      if (value !== undefined)
        student[field] = value === null || value.trim() === '' ? null : value.trim()
    }
  }
  const setFlag = (
    student: MockStudent,
    link: MockLink,
    flag: 'is_payer' | 'is_primary_contact',
  ) => {
    for (const other of student.links) other[flag] = other === link
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
      case 'GET /me': {
        if (current === null) {
          return route.fulfill({ status: 401, json: { message: 'Unauthenticated.' } })
        }
        // Nom des écoles renommées par PATCH /school (comme l'API, qui lit schools.name)
        const me = profileOf(current, mustChange)
        const schools = me.schools.map((school) => ({
          ...school,
          name: profiles.get(school.id)?.name ?? school.name,
        }))
        return route.fulfill({ json: { data: { ...me, schools } } })
      }
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
      case 'GET /academic-years':
        return route.fulfill({ json: { data: yearsOf(schoolHeader ?? '') } })
      case 'POST /academic-years': {
        const schoolId = schoolHeader ?? ''
        if (!canEditSchool(schoolId)) return route.fulfill(forbidden)
        return route.fulfill(saveYear(schoolId, null, yearBody.parse(request.postDataJSON())))
      }
      case 'GET /classrooms': {
        const schoolId = schoolHeader ?? ''
        const query = new URL(request.url()).searchParams
        const yearId =
          query.get('academic_year_id') ??
          yearsOf(schoolId).find((candidate) => candidate.is_current)?.id
        const order = (classroom: MockClassroom) => {
          const found = levelOf(schoolId, classroom.level_id)
          return (found?.cycle.position ?? 0) * 100 + (found?.level.position ?? 0)
        }
        const data = classroomsOf(schoolId)
          .filter((classroom) => classroom.academic_year_id === yearId)
          .filter((classroom) => {
            const cycleId = levelOf(schoolId, classroom.level_id)?.cycle.id ?? null
            return (
              holds(schoolId, 'school.settings.view', cycleId) ||
              holds(schoolId, 'students.view', cycleId)
            )
          })
          .sort((a, b) => order(a) - order(b) || a.section.localeCompare(b.section))
          .map((classroom) => classroomResource(schoolId, classroom))
        return route.fulfill({ json: { data } })
      }
      case 'POST /classrooms': {
        const schoolId = schoolHeader ?? ''
        return route.fulfill(
          saveClassroom(schoolId, null, classroomBody.parse(request.postDataJSON())),
        )
      }
      case 'GET /students': {
        const schoolId = schoolHeader ?? ''
        const query = new URL(request.url()).searchParams
        const search = (query.get('search') ?? '').toLowerCase()
        const digits = search.replace(/\D/g, '')
        const status = query.get('status') ?? 'active'
        const all = studentsOf(schoolId)
          .filter((student) => canSee(schoolId, student))
          .filter((student) => {
            const enrollment = latestEnrollment(student)
            if (enrollment === undefined) return false
            if (status !== 'all' && enrollment.status !== status) return false
            const classroomId = query.get('classroom_id')
            if (classroomId !== null && enrollment.classroom_id !== classroomId) return false
            const cycleId = query.get('cycle_id')
            return (
              cycleId === null || cycleOfClassroom(schoolId, enrollment.classroom_id) === cycleId
            )
          })
          .filter((student) => {
            if (search === '') return true
            const guardians = student.links.map((link) => guardianResource(schoolId, link))
            return (
              `${student.first_name} ${student.last_name}`.toLowerCase().includes(search) ||
              `${student.last_name} ${student.first_name}`.toLowerCase().includes(search) ||
              student.matricule.toLowerCase().includes(search) ||
              guardians.some(
                (guardian) =>
                  guardian.name.toLowerCase().includes(search) ||
                  (digits.length >= 4 && guardian.phone.includes(digits)),
              )
            )
          })
          .sort(
            (a, b) =>
              a.last_name.localeCompare(b.last_name, 'fr') ||
              a.first_name.localeCompare(b.first_name, 'fr'),
          )
        const offset = Number(query.get('cursor') ?? '0')
        const page = all.slice(offset, offset + 25)
        return route.fulfill({
          json: {
            data: page.map((student) => studentRow(schoolId, student)),
            links: { first: null, last: null, prev: null, next: null },
            meta: {
              path: '',
              per_page: 25,
              next_cursor: offset + 25 < all.length ? String(offset + 25) : null,
              prev_cursor: null,
            },
          },
        })
      }
      case 'POST /enrollments': {
        const schoolId = schoolHeader ?? ''
        const body = z
          .object({
            classroom_id: z.string(),
            student: studentBody,
            guardians: z.array(guardianBody),
          })
          .parse(request.postDataJSON())
        const classroom = classroomsOf(schoolId).find(
          (candidate) => candidate.id === body.classroom_id,
        )
        if (classroom === undefined) {
          return route.fulfill({
            status: 422,
            json: { message: 'Classe inconnue.', errors: { classroom_id: ['Classe inconnue.'] } },
          })
        }
        const cycleId = cycleOfClassroom(schoolId, classroom.id)
        if (!holds(schoolId, 'students.manage', cycleId)) return route.fulfill(forbidden)
        const errors: Record<string, string[]> = {
          ...medicalErrors(schoolId, cycleId, body.student, 'student.'),
        }
        body.guardians.forEach((guardian, index) => {
          if (phoneOf(guardian.phone) === null)
            errors[`guardians.${String(index)}.phone`] = [
              'Saisissez un numéro de téléphone valide.',
            ]
        })
        if (Object.keys(errors).length > 0) {
          return route.fulfill({ status: 422, json: { message: 'Données invalides.', errors } })
        }
        if (
          classroom.capacity !== null &&
          takenSeats(schoolId, classroom.id) >= classroom.capacity
        ) {
          return route.fulfill({
            status: 409,
            json: { message: 'Classe complète.', code: 'classroom_full' },
          })
        }
        const student: MockStudent = {
          id: nextStudentId(),
          matricule: nextMatricule(schoolId),
          first_name: '',
          last_name: '',
          gender: 'F',
          birth_date: '',
          birth_place: null,
          address: null,
          blood_type: null,
          allergies: null,
          medical_notes: null,
          links: [],
          enrollments: [
            {
              id: nextStudentId(),
              academic_year_id: classroom.academic_year_id,
              classroom_id: classroom.id,
              status: 'active',
              enrolled_on: '2026-11-04',
              left_on: null,
              leave_reason: null,
            },
          ],
        }
        applyStudent(student, body.student)
        const hasPayer = body.guardians.some((guardian) => guardian.is_payer === true)
        body.guardians.forEach((input, index) => {
          const guardian = guardianByPhone(
            schoolId,
            phoneOf(input.phone) ?? '',
            input.name?.trim() ?? '',
            input.profession ?? null,
          )
          student.links.push({
            guardian_id: guardian.id,
            relation: input.relation ?? 'guardian',
            is_primary_contact: input.is_primary_contact ?? index === 0,
            is_payer: input.is_payer ?? (!hasPayer && index === 0),
            can_pick_up: input.can_pick_up ?? true,
          })
        })
        studentsOf(schoolId).push(student)
        return route.fulfill({ status: 201, json: { data: studentFile(schoolId, student) } })
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
        if (typeof body.code === 'string' && body.code !== profile.code) {
          if (studentsOf(schoolId).length > 0)
            return route.fulfill({
              status: 409,
              json: { message: 'Préfixe figé.', code: 'code_locked' },
            })
          profile.code = body.code
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
        if (path.startsWith('/students/')) {
          const schoolId = schoolHeader ?? ''
          const [, , studentId, sub, guardianId] = path.split('/')
          const student = studentsOf(schoolId).find((candidate) => candidate.id === studentId)
          if (student === undefined || !canSee(schoolId, student))
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          if (request.method() === 'GET' && sub === undefined)
            return route.fulfill({ json: { data: studentFile(schoolId, student) } })
          if (!manages(schoolId, student)) return route.fulfill(forbidden)
          if (sub === undefined && request.method() === 'PATCH') {
            const body = studentBody.parse(request.postDataJSON())
            const enrollment = latestEnrollment(student)
            const errors = medicalErrors(
              schoolId,
              enrollment === undefined ? null : cycleOfClassroom(schoolId, enrollment.classroom_id),
              body,
              '',
            )
            if (errors !== null && Object.keys(errors).length > 0)
              return route.fulfill({ status: 422, json: { message: 'Données invalides.', errors } })
            applyStudent(student, body)
            return route.fulfill({ json: { data: studentFile(schoolId, student) } })
          }
          if (sub === undefined && request.method() === 'DELETE') {
            const students = studentsOf(schoolId)
            students.splice(students.indexOf(student), 1)
            return route.fulfill({ status: 204 })
          }
          // Photos : l'API réelle renverrait une URL signée de 10 minutes ; image de test (1 × 1, orange)
          const photo =
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg=='
          if (sub === 'photo') {
            student.photo_url = request.method() === 'POST' ? photo : null
            return route.fulfill({ json: { data: studentFile(schoolId, student) } })
          }
          if (sub === 'guardians' && path.endsWith('/photo')) {
            const guardian = guardiansOf(schoolId).find((candidate) => candidate.id === guardianId)
            if (
              guardian === undefined ||
              !student.links.some((link) => link.guardian_id === guardianId)
            )
              return route.fulfill({ status: 404, json: { message: 'Not Found' } })
            guardian.photo_url = request.method() === 'POST' ? photo : null
            return route.fulfill({ json: { data: studentFile(schoolId, student) } })
          }
          if (sub === 'guardians') {
            if (request.method() === 'POST') {
              const body = guardianBody.parse(request.postDataJSON())
              const phone = phoneOf(body.phone)
              if (phone === null)
                return route.fulfill({
                  status: 422,
                  json: {
                    message: 'Téléphone invalide.',
                    errors: { phone: ['Saisissez un numéro de téléphone valide.'] },
                  },
                })
              const guardian = guardianByPhone(
                schoolId,
                phone,
                body.name?.trim() ?? '',
                body.profession ?? null,
              )
              if (student.links.some((link) => link.guardian_id === guardian.id))
                return route.fulfill({
                  status: 422,
                  json: {
                    message: 'Déjà lié.',
                    errors: { phone: ['Ce tuteur est déjà lié à l’élève.'] },
                  },
                })
              const link: MockLink = {
                guardian_id: guardian.id,
                relation: body.relation ?? 'guardian',
                is_primary_contact: false,
                is_payer: false,
                can_pick_up: body.can_pick_up ?? true,
              }
              student.links.push(link)
              if (body.is_payer === true) setFlag(student, link, 'is_payer')
              if (body.is_primary_contact === true) setFlag(student, link, 'is_primary_contact')
              return route.fulfill({ json: { data: studentFile(schoolId, student) } })
            }
            const link = student.links.find((candidate) => candidate.guardian_id === guardianId)
            const guardian = guardiansOf(schoolId).find((candidate) => candidate.id === guardianId)
            if (link === undefined || guardian === undefined)
              return route.fulfill({ status: 404, json: { message: 'Not Found' } })
            if (request.method() === 'PATCH') {
              const body = guardianBody.parse(request.postDataJSON())
              if (body.is_payer === false && link.is_payer)
                return route.fulfill({
                  status: 422,
                  json: {
                    message: 'Payeur requis.',
                    errors: { is_payer: ['Désignez un autre tuteur comme payeur.'] },
                  },
                })
              if (body.name !== undefined) guardian.name = body.name.trim()
              if (body.profession !== undefined) guardian.profession = body.profession
              if (body.email !== undefined) guardian.email = body.email
              const phone = body.phone === undefined ? null : phoneOf(body.phone)
              if (phone !== null) guardian.phone = phone
              if (body.relation !== undefined) link.relation = body.relation
              if (body.can_pick_up !== undefined) link.can_pick_up = body.can_pick_up
              if (body.is_payer === true) setFlag(student, link, 'is_payer')
              if (body.is_primary_contact === true) setFlag(student, link, 'is_primary_contact')
              return route.fulfill({ json: { data: studentFile(schoolId, student) } })
            }
            if (request.method() === 'DELETE') {
              if (student.links.length === 1)
                return route.fulfill({
                  status: 409,
                  json: { message: 'Dernier tuteur.', code: 'last_guardian' },
                })
              if (link.is_payer || link.is_primary_contact)
                return route.fulfill({
                  status: 409,
                  json: { message: 'À remplacer.', code: 'reassign_first' },
                })
              student.links.splice(student.links.indexOf(link), 1)
              return route.fulfill({ json: { data: studentFile(schoolId, student) } })
            }
          }
        }
        if (request.method() === 'PATCH' && path.startsWith('/enrollments/')) {
          const schoolId = schoolHeader ?? ''
          const student = studentsOf(schoolId).find((candidate) =>
            candidate.enrollments.some((enrollment) => path.endsWith(enrollment.id)),
          )
          const enrollment = student?.enrollments.find((candidate) => path.endsWith(candidate.id))
          if (student === undefined || enrollment === undefined || !canSee(schoolId, student))
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          if (!manages(schoolId, student)) return route.fulfill(forbidden)
          const body = z
            .object({
              classroom_id: z.optional(z.string()),
              status: z.optional(z.enum(['active', 'left'])),
              left_on: z.optional(z.string()),
              leave_reason: z.optional(z.nullable(z.string())),
            })
            .parse(request.postDataJSON())
          if (body.classroom_id !== undefined) {
            const target = classroomsOf(schoolId).find(
              (candidate) => candidate.id === body.classroom_id,
            )
            if (
              target === undefined ||
              !holds(schoolId, 'students.manage', cycleOfClassroom(schoolId, target.id))
            )
              return route.fulfill(forbidden)
            if (target.capacity !== null && takenSeats(schoolId, target.id) >= target.capacity)
              return route.fulfill({
                status: 409,
                json: { message: 'Classe complète.', code: 'classroom_full' },
              })
            enrollment.classroom_id = target.id
          }
          if (body.status === 'left') {
            enrollment.status = 'left'
            enrollment.left_on = body.left_on ?? null
            enrollment.leave_reason = body.leave_reason ?? null
          }
          if (body.status === 'active') {
            enrollment.status = 'active'
            enrollment.left_on = null
            enrollment.leave_reason = null
          }
          return route.fulfill({ json: { data: studentFile(schoolId, student) } })
        }
        if (request.method() === 'PATCH' && path.startsWith('/academic-years/')) {
          const schoolId = schoolHeader ?? ''
          const year = yearsOf(schoolId).find((candidate) => path.endsWith(candidate.id))
          if (year === undefined)
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          if (!canEditSchool(schoolId)) return route.fulfill(forbidden)
          return route.fulfill(saveYear(schoolId, year, yearBody.parse(request.postDataJSON())))
        }
        if (path.startsWith('/classrooms/')) {
          const schoolId = schoolHeader ?? ''
          const classrooms = classroomsOf(schoolId)
          const classroom = classrooms.find((candidate) => path.endsWith(candidate.id))
          if (classroom === undefined)
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          if (request.method() === 'PATCH') {
            return route.fulfill(
              saveClassroom(schoolId, classroom, classroomBody.parse(request.postDataJSON())),
            )
          }
          if (request.method() === 'DELETE') {
            const cycleId = levelOf(schoolId, classroom.level_id)?.cycle.id ?? null
            if (!holds(schoolId, 'school.settings.manage', cycleId)) return route.fulfill(forbidden)
            if (
              studentsOf(schoolId).some((student) =>
                student.enrollments.some((enrollment) => enrollment.classroom_id === classroom.id),
              )
            )
              return route.fulfill({
                status: 409,
                json: { message: 'Classe non vide.', code: 'classroom_not_empty' },
              })
            classrooms.splice(classrooms.indexOf(classroom), 1)
            return route.fulfill({ status: 204 })
          }
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
