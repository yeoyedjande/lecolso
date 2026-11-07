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
      grade_scale: '10',
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
  'billing.discount': ['director'],
  'billing.cancel': ['director'],
  'billing.refund': ['director'],
  'grades.view': ['promoter', 'director', 'secretary', 'teacher', 'guardian'],
  'grades.manage': ['director', 'teacher'],
  'grades.validate': ['director'],
  'attendance.view': ['promoter', 'director', 'secretary', 'teacher', 'guardian'],
  'attendance.manage': ['director', 'secretary', 'teacher'],
  'attendance.justify': ['guardian'],
  'messaging.send': ['promoter', 'director', 'secretary', 'accountant', 'teacher', 'guardian'],
  'messaging.announce': ['promoter', 'director', 'secretary'],
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
  /** Autre compte connecté (données conservées) : parcours qui passe du parent à l'école. */
  switchSession: (account: Account) => void
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
  // Pré-inscriptions reçues en ligne (comme PreRegistrationResource), par école ; une demande de démonstration
  interface MockPreRegistration {
    id: string
    reference: string
    status: 'pending' | 'refused' | 'enrolled'
    created_at: string
    child: { last_name: string; first_name: string; gender: 'F' | 'M'; birth_date: string }
    level: { id: string; name: string; cycle_id: string; cycle_name: string }
    guardian: { name: string; phone: string; email: string | null }
    message: string | null
    decided_by_name: string | null
    decided_at: string | null
    decision_note: string | null
    student_id: string | null
    notification_status: string | null
    notification_failure: string | null
  }
  const preRegistrations = new Map<string, MockPreRegistration[]>()
  const preRegistrationsOf = (schoolId: string): MockPreRegistration[] => {
    const existing = preRegistrations.get(schoolId)
    if (existing !== undefined) return existing
    const primary = CYCLES.find((cycle) => cycle.code === 'primary')
    const ce1 = primary?.levels.find((level) => level.code === 'CE1')
    const list: MockPreRegistration[] =
      schoolKeyOf(schoolId) === 'lauriers' && primary !== undefined && ce1 !== undefined
        ? [
            {
              id: '0195f000-0000-7000-8000-00000000e001',
              reference: 'PRE-2026-000001',
              status: 'pending',
              created_at: '2026-11-06T16:20:00+00:00',
              child: {
                last_name: 'Touré',
                first_name: 'Mariam',
                gender: 'F',
                birth_date: '2019-02-11',
              },
              level: { id: ce1.id, name: ce1.name, cycle_id: primary.id, cycle_name: primary.name },
              guardian: { name: 'Salimata Touré', phone: '+2250707070701', email: null },
              message: 'Nous arrivons de Yamoussoukro en janvier.',
              decided_by_name: null,
              decided_at: null,
              decision_note: null,
              student_id: null,
              notification_status: null,
              notification_failure: null,
            },
          ]
        : []
    preRegistrations.set(schoolId, list)
    return list
  }
  // Lectures du reçu PDF par version (paiement, annulé ou non)
  const receiptPdfReads = new Map<string, number>()
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
    public_fees: boolean
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
      public_fees: false,
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
  // Facturation (comme le lot 5a et le DemoSeeder) : types de frais, grille par niveau, calendrier par cycle,
  // une facture par élève (un sur trois avec la cantine, un sur cinq avec le transport, une remise pour Ange)
  const FEE_TYPES = [
    {
      id: 'ft-registration',
      code: 'registration',
      name: 'Inscription',
      billing: 'once',
      is_optional: false,
    },
    {
      id: 'ft-tuition',
      code: 'tuition',
      name: 'Scolarité',
      billing: 'recurring',
      is_optional: false,
    },
    { id: 'ft-canteen', code: 'canteen', name: 'Cantine', billing: 'recurring', is_optional: true },
    {
      id: 'ft-transport',
      code: 'transport',
      name: 'Transport',
      billing: 'recurring',
      is_optional: true,
    },
    {
      id: 'ft-daycare',
      code: 'daycare',
      name: 'Garderie du soir',
      billing: 'recurring',
      is_optional: true,
    },
  ] as const
  const TUITION: Record<string, number> = { daycare: 360000, kindergarten: 300000, primary: 270000 }
  const TUITION_BONUS: Record<string, number> = { CE1: 10000, CE2: 10000, CM1: 20000, CM2: 30000 }
  interface MockInstallment {
    due_on: string
    label: string
    amount: number
  }
  interface MockLine {
    id: string
    kind: 'fee' | 'discount' | 'manual'
    fee_type_id: string | null
    label: string
    amount: number
    reason: string | null
    installments: MockInstallment[]
  }
  interface MockInvoice {
    id: string
    student_id: string
    lines: MockLine[]
  }
  const grids = new Map<string, Map<string, number>>()
  const calendars = new Map<string, MockInstallment[]>()
  const invoices = new Map<string, MockInvoice[]>()
  interface MockPayment {
    id: string
    invoice_id: string
    receipt_number: string
    amount: number
    method: string
    reference: string | null
    payer_name: string
    cashier_name: string
    cashier_phone: string
    paid_at: string
    cancellation: { reason: string; cancelled_at: string; cancelled_by_name: string } | null
  }
  const payments = new Map<string, MockPayment[]>()
  const paymentsOf = (schoolId: string): MockPayment[] => {
    const existing = payments.get(schoolId)
    if (existing !== undefined) return existing
    const list: MockPayment[] = []
    payments.set(schoolId, list)
    // Un encaissement du comptable ce matin (comme le seeder : caisse du jour non vide)
    const first = invoicesOf(schoolId).find(
      (invoice) => invoice.student_id === lauriersStudentId(1),
    )
    if (first !== undefined)
      list.push({
        id: 'pay-lau-00001',
        invoice_id: first.id,
        receipt_number: 'REC-2026-000001',
        amount: 25000,
        method: 'cash',
        reference: null,
        payer_name: '',
        cashier_name: 'Moussa Comptable',
        cashier_phone: '+2250700000006',
        paid_at: '2026-11-04T08:15:00+00:00',
        cancellation: null,
      })
    return list
  }
  const closedSessions = new Map<
    string,
    { closed_at: string; counted: number; note: string | null }
  >()
  const PAID_AT = '2026-11-04T09:30:00+00:00'
  const policies = new Map<string, string>()
  // Mobile Money (lot 10a) : frais par école, demandes de paiement (prestataire factice : 2e lecture = payé)
  const mobileMoneyFees = new Map<
    string,
    { fee_payer: 'school' | 'guardian'; fee_rate_bps: number }
  >()
  const feesOf = (schoolId: string) =>
    mobileMoneyFees.get(schoolId) ?? { fee_payer: 'school' as const, fee_rate_bps: 0 }
  interface MockIntent {
    id: string
    studentId: string
    invoiceId: string
    method: string
    phone: string
    amount: number
    fee: number
    charged: number
    feePayer: 'school' | 'guardian'
    status: 'pending' | 'succeeded' | 'failed' | 'expired'
    reads: number
    paymentId: string | null
    failureReason: string | null
  }
  const intents = new Map<string, MockIntent>()
  /** Paiement tel que l'API le renvoie (sans les champs internes de la simulation). */
  const paymentResource = (payment: MockPayment) => ({
    id: payment.id,
    receipt_number: payment.receipt_number,
    paid_at: payment.paid_at,
    amount: payment.amount,
    method: payment.method,
    reference: payment.reference,
    payer_name: payment.payer_name,
    cashier_name: payment.cashier_name,
    cancellation: payment.cancellation,
  })
  let billingCounter = 0
  const nextBillingId = () => {
    billingCounter += 1
    return `0195f000-0000-7000-8000-0000000d${String(billingCounter).padStart(4, '0')}`
  }
  const gridOf = (schoolId: string): Map<string, number> => {
    const existing = grids.get(schoolId)
    if (existing !== undefined) return existing
    const grid = new Map<string, number>()
    for (const cycle of cyclesOf(schoolId)) {
      for (const level of cycle.levels) {
        grid.set(`${level.id}:ft-registration`, cycle.code === 'daycare' ? 20000 : 25000)
        grid.set(
          `${level.id}:ft-tuition`,
          (TUITION[cycle.code] ?? 270000) + (TUITION_BONUS[level.code] ?? 0),
        )
        grid.set(`${level.id}:ft-canteen`, 90000)
        grid.set(`${level.id}:ft-transport`, 120000)
        if (cycle.code !== 'daycare') grid.set(`${level.id}:ft-daycare`, 60000)
      }
    }
    grids.set(schoolId, grid)
    return grid
  }
  const MONTHS = [
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
  ]
  const calendarOf = (schoolId: string, cycleId: string): MockInstallment[] => {
    const key = `${schoolId}:${cycleId}`
    const existing = calendars.get(key)
    if (existing !== undefined) return existing
    const cycle = cyclesOf(schoolId).find((candidate) => candidate.id === cycleId)
    const dates =
      cycle?.settings.billing_period === 'monthly'
        ? MONTHS.map((label, index) => ({
            due_on:
              index === 0
                ? '2026-09-07'
                : `${String(index < 4 ? 2026 : 2027)}-${String(((8 + index) % 12) + 1).padStart(2, '0')}-05`,
            label,
            amount: 0,
          }))
        : [
            { due_on: '2026-09-07', label: '1er trimestre', amount: 0 },
            { due_on: '2027-01-05', label: '2e trimestre', amount: 0 },
            { due_on: '2027-04-05', label: '3e trimestre', amount: 0 },
          ]
    calendars.set(key, dates)
    return dates
  }
  /** Comme InvoiceSchedule::remainingShares : parts égales, périodes restantes à partir de `from`. */
  const remainingShares = (
    amount: number,
    dates: MockInstallment[],
    from: string,
  ): MockInstallment[] => {
    const share = Math.floor(amount / dates.length)
    return dates.flatMap((date, index) => {
      const next = dates[index + 1]
      if (next !== undefined && from >= next.due_on) return []
      const value = index === dates.length - 1 ? amount - share * (dates.length - 1) : share
      return [{ due_on: date.due_on < from ? from : date.due_on, label: date.label, amount: value }]
    })
  }
  const levelOfStudent = (schoolId: string, student: MockStudent) => {
    const enrollment = latestEnrollment(student)
    const classroom = classroomsOf(schoolId).find(
      (candidate) => candidate.id === enrollment?.classroom_id,
    )
    return classroom === undefined ? undefined : levelOf(schoolId, classroom.level_id)
  }
  const feeLine = (
    schoolId: string,
    student: MockStudent,
    typeId: string,
    from: string,
  ): MockLine | null => {
    const found = levelOfStudent(schoolId, student)
    const type = FEE_TYPES.find((candidate) => candidate.id === typeId)
    const amount =
      found === undefined ? 0 : (gridOf(schoolId).get(`${found.level.id}:${typeId}`) ?? 0)
    if (found === undefined || type === undefined || amount === 0) return null
    const installments =
      type.billing === 'once'
        ? [{ due_on: from, label: type.name, amount }]
        : remainingShares(amount, calendarOf(schoolId, found.cycle.id), from)
    return {
      id: nextBillingId(),
      kind: 'fee',
      fee_type_id: typeId,
      label: type.name,
      amount: installments.reduce((sum, item) => sum + item.amount, 0),
      reason: null,
      installments,
    }
  }
  /** Comme InvoiceSchedule::rebalanceDiscounts : de la dernière échéance vers la première. */
  const rebalance = (invoice: MockInvoice): boolean => {
    const net = new Map<string, number>()
    for (const line of invoice.lines.filter((candidate) => candidate.kind !== 'discount'))
      for (const item of line.installments)
        net.set(item.due_on, (net.get(item.due_on) ?? 0) + item.amount)
    const order = [...net.keys()].sort().reverse()
    for (const discount of invoice.lines.filter((candidate) => candidate.kind === 'discount')) {
      let remaining = -discount.amount
      discount.installments = []
      for (const day of order) {
        const part = Math.min(remaining, net.get(day) ?? 0)
        if (part <= 0) continue
        discount.installments.push({ due_on: day, label: 'Remise', amount: -part })
        net.set(day, (net.get(day) ?? 0) - part)
        remaining -= part
      }
      if (remaining > 0) return false
    }
    return true
  }
  const createInvoice = (
    schoolId: string,
    student: MockStudent,
    options: string[],
    from: string,
  ): MockInvoice => {
    const lines = FEE_TYPES.filter(
      (type) => !type.is_optional || options.includes(type.code),
    ).flatMap((type) => {
      const line = feeLine(schoolId, student, type.id, from)
      return line === null ? [] : [line]
    })
    const invoice = { id: nextBillingId(), student_id: student.id, lines }
    invoicesOf(schoolId).push(invoice)
    return invoice
  }
  const invoicesOf = (schoolId: string): MockInvoice[] => {
    const existing = invoices.get(schoolId)
    if (existing !== undefined) return existing
    const list: MockInvoice[] = []
    invoices.set(schoolId, list)
    studentsOf(schoolId)
      .slice()
      .sort((a, b) => a.matricule.localeCompare(b.matricule))
      .forEach((student, index) => {
        const options = [
          index % 3 === 0 ? 'canteen' : null,
          index % 5 === 0 ? 'transport' : null,
        ].filter((code): code is string => code !== null)
        const invoice = createInvoice(schoolId, student, options, '2026-09-07')
        if (student.first_name === 'Ange') {
          invoice.lines.push({
            id: nextBillingId(),
            kind: 'discount',
            fee_type_id: null,
            label: 'Remise',
            amount: -30000,
            reason: 'Fratrie : deux enfants inscrits',
            installments: [],
          })
          rebalance(invoice)
        }
      })
    return list
  }
  const invoiceResource = (schoolId: string, invoice: MockInvoice) => {
    const student = studentsOf(schoolId).find((candidate) => candidate.id === invoice.student_id)
    const row = student === undefined ? undefined : studentRow(schoolId, student)
    const found = student === undefined ? undefined : levelOfStudent(schoolId, student)
    const cycleId = found?.cycle.id ?? null
    // Montant par date (remises déduites), libellé de la première part positive à cette date
    const byDate = new Map<string, MockInstallment>()
    for (const line of invoice.lines)
      for (const item of line.installments) {
        const current = byDate.get(item.due_on)
        byDate.set(item.due_on, {
          due_on: item.due_on,
          label:
            current === undefined || (current.amount <= 0 && item.amount > 0)
              ? item.label
              : current.label,
          amount: (current?.amount ?? 0) + item.amount,
        })
      }
    const present = invoice.lines.map((line) => line.fee_type_id)
    const invoicePayments = paymentsOf(schoolId).filter(
      (payment) => payment.invoice_id === invoice.id,
    )
    const settled = invoicePayments
      .filter((payment) => payment.cancellation === null)
      .reduce((sum, payment) => sum + payment.amount, 0)
    const schedule = [...byDate.values()]
      .filter((item) => item.amount !== 0)
      .sort((a, b) => a.due_on.localeCompare(b.due_on))
    let left = settled
    const withSettled = schedule.map((item) => {
      const part = Math.max(0, Math.min(item.amount, left))
      left -= part
      return { ...item, settled: part }
    })
    const total = invoice.lines.reduce((sum, line) => sum + line.amount, 0)
    const dueToDate = schedule
      .filter((item) => item.due_on <= '2026-11-04')
      .reduce((sum, item) => sum + item.amount, 0)
    const nextItem = withSettled.find((item) => item.settled < item.amount)
    return {
      id: invoice.id,
      academic_year: { id: yearsOf(schoolId)[0]?.id ?? '', label: '2026-2027', is_current: true },
      classroom_name: row?.enrollment?.classroom_name ?? '',
      payer:
        row?.primary_contact === null || row === undefined
          ? null
          : { name: row.primary_contact.name },
      left_on: null,
      total,
      balance: {
        settled,
        remaining: Math.max(0, total - settled),
        overdue: Math.max(0, dueToDate - settled),
        credit: Math.max(0, settled - total),
        next:
          nextItem === undefined
            ? null
            : {
                due_on: nextItem.due_on,
                label: nextItem.label,
                amount: nextItem.amount - nextItem.settled,
              },
      },
      payments: invoicePayments.slice().reverse().map(paymentResource),
      refunds: [],
      transfers: [],
      credit_targets: [],
      discount_total: -invoice.lines
        .filter((line) => line.kind === 'discount')
        .reduce((sum, line) => sum + line.amount, 0),
      lines: invoice.lines.map((line) => {
        const type = FEE_TYPES.find((candidate) => candidate.id === line.fee_type_id)
        return {
          id: line.id,
          kind: line.kind,
          fee_type_id: line.fee_type_id,
          fee_type_code: type?.code ?? null,
          is_optional: type?.is_optional ?? false,
          label: line.label,
          amount: line.amount,
          reason: line.reason,
        }
      }),
      schedule: withSettled,
      available_options: FEE_TYPES.filter(
        (type) =>
          type.is_optional &&
          !present.includes(type.id) &&
          found !== undefined &&
          (gridOf(schoolId).get(`${found.level.id}:${type.id}`) ?? 0) > 0,
      ).map((type) => ({
        fee_type_id: type.id,
        code: type.code,
        name: type.name,
        amount:
          found === undefined ? 0 : (gridOf(schoolId).get(`${found.level.id}:${type.id}`) ?? 0),
      })),
      can_manage: holds(schoolId, 'billing.manage', cycleId),
      can_collect: holds(schoolId, 'billing.manage', cycleId),
      can_discount: holds(schoolId, 'billing.discount', cycleId),
      can_cancel: holds(schoolId, 'billing.cancel', cycleId),
      can_refund: holds(schoolId, 'billing.refund', cycleId),
    }
  }
  // --- Présences (comme le domaine Attendance) ---
  interface MockMark {
    id: string
    status: 'absent' | 'late'
    justification: {
      id: string
      status: 'pending' | 'accepted' | 'refused'
      source: 'guardian' | 'school'
      reason: string
      by: string
      at: string
      plannedId?: string
    } | null
  }
  interface MockCall {
    by: string
    at: string
    marks: Map<string, MockMark>
  }
  const rollCalls = new Map<string, MockCall>()
  const daycare = new Map<
    string,
    {
      visit: {
        arrived_at: string | null
        left_at: string | null
        dropped_by: string | null
        picked_up_by: string | null
      } | null
      logs: { id: string; time: string; kind: string; note: string }[]
    }
  >()
  const syncDone = new Set<string>()
  const TODAY = '2026-11-04'
  /** Personnel (hors parents et enseignants) avec la permission sur le cycle, ou sur toute l'école. */
  const staffHolds = (schoolId: string, permission: string, cycleId: string | null) => {
    const schoolKey = schoolKeyOf(schoolId)
    return (
      current?.roles.some(
        (assignment) =>
          assignment.school === schoolKey &&
          assignment.role !== 'teacher' &&
          assignment.role !== 'guardian' &&
          (assignment.cycle === undefined || assignment.cycle === cycleId) &&
          PERMISSIONS[permission]?.includes(assignment.role) === true,
      ) ?? false
    )
  }
  /** Titulaire : l'enseignant(e) connecté(e) tient cette classe (comme AttendanceAccess et GradingAccess). */
  const isHomeroom = (classroom: MockClassroom) =>
    current !== null &&
    classroom.homeroom_teacher_id === userId(current.phone) &&
    current.roles.some((assignment) => assignment.role === 'teacher')
  const attendanceClassrooms = (schoolId: string) =>
    classroomsOf(schoolId).flatMap((classroom) => {
      const found = levelOf(schoolId, classroom.level_id)
      const homeroom = isHomeroom(classroom)
      if (
        found === undefined ||
        (!homeroom && !staffHolds(schoolId, 'attendance.view', found.cycle.id))
      )
        return []
      return [
        {
          id: classroom.id,
          name: `${found.level.code} ${classroom.section}`,
          cycle: { id: found.cycle.id, code: found.cycle.code, name: found.cycle.name },
          mode: found.cycle.settings.attendance_mode,
          can_take: homeroom || staffHolds(schoolId, 'attendance.manage', found.cycle.id),
          is_homeroom: homeroom,
        },
      ]
    })
  const rosterOf = (schoolId: string, classroomId: string) =>
    studentsOf(schoolId)
      .filter((student) => latestEnrollment(student)?.classroom_id === classroomId)
      .sort(
        (a, b) =>
          a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name),
      )
  const attendanceStudent = (schoolId: string, student: MockStudent) => ({
    id: student.id,
    full_name: studentRow(schoolId, student).full_name,
    first_name: student.first_name,
    matricule: student.matricule,
    photo_url: null,
  })
  const rollCallResource = (schoolId: string, classroomId: string, date: string) => {
    const classroom = attendanceClassrooms(schoolId).find(
      (candidate) => candidate.id === classroomId,
    )
    const call = rollCalls.get(`${classroomId}:${date}`)
    return {
      classroom: { id: classroomId, name: classroom?.name ?? '' },
      date,
      taken: call === undefined ? null : { by: call.by, at: call.at },
      corrections: [],
      rows: rosterOf(schoolId, classroomId).map((student) => {
        const mark = call?.marks.get(student.id)
        const planned = plannedOn(schoolId, student.id, date)
        return {
          student: attendanceStudent(schoolId, student),
          mark_id: mark?.id ?? null,
          status:
            mark?.status ?? (planned !== undefined && call === undefined ? 'absent' : 'present'),
          planned: planned === undefined ? null : { id: planned.id, status: planned.status },
          late_minutes: null,
          justification:
            mark?.justification == null
              ? null
              : { status: mark.justification.status, source: mark.justification.source },
        }
      }),
      can_edit: date === TODAY && (classroom?.can_take ?? false),
      needs_reason: date < TODAY,
    }
  }
  const saveCall = (
    classroomId: string,
    date: string,
    marks: { student_id: string; status: string }[],
  ) => {
    const previous = rollCalls.get(`${classroomId}:${date}`)
    const next: MockCall = {
      by: current?.name ?? '',
      at: `${TODAY}T08:05:00+00:00`,
      marks: new Map(),
    }
    for (const mark of marks) {
      if (mark.status !== 'absent' && mark.status !== 'late') continue
      const old = previous?.marks.get(mark.student_id)
      next.marks.set(mark.student_id, {
        id: old?.id ?? nextBillingId(),
        status: mark.status,
        justification: old?.justification ?? null,
      })
    }
    rollCalls.set(`${classroomId}:${date}`, next)
    const schoolId = [...schoolClassrooms.entries()].find(([, list]) =>
      list.some((classroom) => classroom.id === classroomId),
    )?.[0]
    for (const [studentId, mark] of next.marks) {
      const planned = schoolId === undefined ? undefined : plannedOn(schoolId, studentId, date)
      if (planned !== undefined) justifyFromPlanned(planned, mark)
    }
  }
  // Notes et compétences (lot 7a) : mêmes règles que le domaine Grading du backend
  const GRADE_SUBJECTS: [string, number][] = [
    ['Français', 3],
    ['Mathématiques', 3],
    ['Éveil (histoire, géographie, sciences)', 2],
    ['Anglais', 1],
    ['Éducation physique et sportive', 1],
    ['Arts et musique', 1],
  ]
  const GRADE_SKILLS: [string, string][] = [
    ['Langage oral', 'S’exprime par une phrase complète'],
    ['Langage oral', 'Récite une comptine'],
    ['Langage écrit', 'Reconnaît son prénom'],
    ['Mathématiques', 'Dénombre une collection jusqu’à 10'],
    ['Motricité', 'Tient correctement son crayon'],
    ['Vivre ensemble', 'Respecte les règles de la classe'],
  ]
  interface MockTerm {
    id: string
    position: number
    label: string
    starts_on: string
    ends_on: string
  }
  interface MockAssessment {
    id: string
    classroom_id: string
    subject_id: string
    term_id: string
    title: string
    date: string
    out_of: number
  }
  const gradingTerms = new Map<string, MockTerm[]>()
  const gradingSubjects = new Map<
    string,
    { id: string; name: string; coefficient: number; position: number }[]
  >()
  const gradingSkills = new Map<
    string,
    { id: string; domain: string; label: string; position: number }[]
  >()
  const assessments = new Map<string, MockAssessment>()
  const seededGrids = new Set<string>()
  const grades = new Map<string, { value: number | null; absent: boolean }>()
  const skillLevels = new Map<string, string>()
  const termsOf = (cycleId: string, termType: string): MockTerm[] => {
    const existing = gradingTerms.get(cycleId)
    if (existing !== undefined) return existing
    const bounds: [string, string, string][] =
      termType === 'trimester'
        ? [
            ['1er trimestre', '2026-09-07', '2026-12-22'],
            ['2e trimestre', '2027-01-05', '2027-03-31'],
            ['3e trimestre', '2027-04-01', '2027-07-16'],
          ]
        : termType === 'semester'
          ? [
              ['1er semestre', '2026-09-07', '2027-01-31'],
              ['2e semestre', '2027-02-01', '2027-07-16'],
            ]
          : [['Année', '2026-09-07', '2027-07-16']]
    const terms = bounds.map(([label, starts_on, ends_on], index) => ({
      id: `${cycleId}-t${String(index + 1)}`,
      position: index + 1,
      label,
      starts_on,
      ends_on,
    }))
    gradingTerms.set(cycleId, terms)
    return terms
  }
  const subjectsOf = (levelId: string) => {
    const existing = gradingSubjects.get(levelId)
    if (existing !== undefined) return existing
    const subjects = GRADE_SUBJECTS.map(([name, coefficient], index) => ({
      id: `${levelId}-s${String(index + 1)}`,
      name,
      coefficient,
      position: index + 1,
    }))
    gradingSubjects.set(levelId, subjects)
    return subjects
  }
  const skillsOf = (cycleId: string) => {
    const existing = gradingSkills.get(cycleId)
    if (existing !== undefined) return existing
    const skills = GRADE_SKILLS.map(([domain, label], index) => ({
      id: `${cycleId}-k${String(index + 1)}`,
      domain,
      label,
      position: index + 1,
    }))
    gradingSkills.set(cycleId, skills)
    return skills
  }
  const gradingClassrooms = (schoolId: string) =>
    classroomsOf(schoolId).flatMap((classroom) => {
      const found = levelOf(schoolId, classroom.level_id)
      const homeroom = isHomeroom(classroom)
      if (
        found === undefined ||
        (!homeroom && !staffHolds(schoolId, 'grades.view', found.cycle.id))
      )
        return []
      return [
        {
          id: classroom.id,
          name: `${found.level.code} ${classroom.section}`,
          level_id: classroom.level_id,
          cycle: { id: found.cycle.id, code: found.cycle.code, name: found.cycle.name },
          mode: found.cycle.settings.assessment_mode,
          grade_scale: Number(found.cycle.settings.grade_scale ?? '10'),
          can_manage: homeroom || staffHolds(schoolId, 'grades.manage', found.cycle.id),
          is_homeroom: homeroom,
          cycleSettings: found.cycle.settings,
        },
      ]
    })
  const pickTerm = (terms: MockTerm[], termId: string | null) =>
    terms.find((term) => term.id === termId) ??
    [...terms].reverse().find((term) => term.starts_on <= TODAY) ??
    terms[0]
  /** Première évaluation de démonstration : « Évaluation 1 » en français au 1er trimestre. */
  const seedGrid = (schoolId: string, classroomId: string, levelId: string, terms: MockTerm[]) => {
    const subject = subjectsOf(levelId)[0]
    if (seededGrids.has(classroomId) || subject === undefined || terms[0] === undefined) return
    seededGrids.add(classroomId)
    const id = `${classroomId}-a1`
    assessments.set(id, {
      id,
      classroom_id: classroomId,
      subject_id: subject.id,
      term_id: terms[0].id,
      title: 'Évaluation 1',
      date: '2026-10-02',
      out_of: 20,
    })
    rosterOf(schoolId, classroomId)
      .slice(0, 3)
      .forEach((student, index) => {
        grades.set(`${id}:${student.id}`, { value: [14, 9.5, 17][index] ?? 12, absent: false })
      })
  }
  const gradeGridResource = (
    schoolId: string,
    classroomId: string,
    termId: string | null,
    subjectId: string | null,
  ) => {
    const classroom = gradingClassrooms(schoolId).find((candidate) => candidate.id === classroomId)
    if (classroom === undefined) return undefined
    const terms = termsOf(classroom.cycle.id, classroom.cycleSettings.term_type)
    const term = pickTerm(terms, termId)
    const subjects = subjectsOf(classroom.level_id)
    const subject = subjects.find((candidate) => candidate.id === subjectId) ?? subjects[0]
    const roster = rosterOf(schoolId, classroomId)
    seedGrid(schoolId, classroomId, classroom.level_id, terms)
    const columns = [...assessments.values()]
      .filter(
        (assessment) =>
          assessment.classroom_id === classroomId &&
          assessment.term_id === term?.id &&
          assessment.subject_id === subject?.id,
      )
      .sort((a, b) => a.date.localeCompare(b.date))
    const scale = classroom.grade_scale
    return {
      classroom: { id: classroomId, name: classroom.name },
      grade_scale: scale,
      terms,
      term,
      subjects,
      subject: subject ?? null,
      assessments: columns,
      rows: roster.map((student) => {
        const cells = columns.map((assessment) => ({
          assessment_id: assessment.id,
          ...(grades.get(`${assessment.id}:${student.id}`) ?? { value: null, absent: false }),
        }))
        const scores = cells.flatMap((cell, index) =>
          cell.value === null || cell.absent
            ? []
            : [(cell.value / (columns[index]?.out_of ?? 20)) * scale],
        )
        return {
          student: attendanceStudent(schoolId, student),
          grades: cells,
          average:
            scores.length === 0
              ? null
              : Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) /
                100,
        }
      }),
      can_manage: classroom.can_manage && !isClosed(classroomId, term?.id ?? ''),
      closed: isClosed(classroomId, term?.id ?? ''),
    }
  }
  const classResultsResource = (schoolId: string, classroomId: string, termId: string | null) => {
    const classroom = gradingClassrooms(schoolId).find((candidate) => candidate.id === classroomId)
    if (classroom === undefined) return undefined
    const terms = termsOf(classroom.cycle.id, classroom.cycleSettings.term_type)
    const term = pickTerm(terms, termId)
    const subjects = classroom.mode === 'weighted_average' ? subjectsOf(classroom.level_id) : []
    const rows = rosterOf(schoolId, classroomId).map((student) => {
      const bySubject = subjects.map((subject) => {
        const average =
          gradeGridResource(schoolId, classroomId, term?.id ?? null, subject.id)?.rows.find(
            (row) => row.student.id === student.id,
          )?.average ?? null
        return { subject_id: subject.id, average, coefficient: subject.coefficient }
      })
      const graded = bySubject.filter((cell) => cell.average !== null)
      const weights = graded.reduce((sum, cell) => sum + cell.coefficient, 0)
      const average =
        weights === 0
          ? null
          : Math.round(
              (graded.reduce((sum, cell) => sum + (cell.average ?? 0) * cell.coefficient, 0) /
                weights) *
                100,
            ) / 100
      const counts = { A: 0, EA: 0, NA: 0 }
      for (const skill of classroom.mode === 'competency' ? skillsOf(classroom.cycle.id) : []) {
        const level = skillLevels.get(`${term?.id ?? ''}:${student.id}:${skill.id}`)
        if (level === 'A' || level === 'EA' || level === 'NA') counts[level] += 1
      }
      return {
        student: attendanceStudent(schoolId, student),
        subjects: bySubject.map(({ subject_id, average: value }) => ({
          subject_id,
          average: value,
        })),
        average,
        skills: classroom.mode === 'competency' ? counts : null,
      }
    })
    const averages = rows.flatMap((row) => (row.average === null ? [] : [row.average]))
    const ranked = rows.map((row) => ({
      ...row,
      rank:
        row.average === null
          ? null
          : averages.filter((other) => other > (row.average ?? 0)).length + 1,
    }))
    return {
      classroom: { id: classroomId, name: classroom.name },
      mode: classroom.mode,
      grade_scale: classroom.grade_scale,
      terms,
      term,
      subjects,
      rows: ranked,
      class_average:
        averages.length === 0
          ? null
          : Math.round((averages.reduce((sum, value) => sum + value, 0) / averages.length) * 100) /
            100,
      highest: averages.length === 0 ? null : Math.max(...averages),
      lowest: averages.length === 0 ? null : Math.min(...averages),
      ranked_count: averages.length,
    }
  }
  const skillGridResource = (schoolId: string, classroomId: string, termId: string | null) => {
    const classroom = gradingClassrooms(schoolId).find((candidate) => candidate.id === classroomId)
    if (classroom === undefined) return undefined
    const terms = termsOf(classroom.cycle.id, classroom.cycleSettings.term_type)
    const term = pickTerm(terms, termId)
    const skills = skillsOf(classroom.cycle.id)
    return {
      classroom: { id: classroomId, name: classroom.name },
      terms,
      term,
      skills,
      rows: rosterOf(schoolId, classroomId).map((student) => ({
        student: attendanceStudent(schoolId, student),
        levels: skills.map((skill) => ({
          skill_id: skill.id,
          level: skillLevels.get(`${term?.id ?? ''}:${student.id}:${skill.id}`) ?? null,
        })),
      })),
      can_manage: classroom.can_manage && !isClosed(classroomId, term?.id ?? ''),
      closed: isClosed(classroomId, term?.id ?? ''),
    }
  }
  const saveGrades = (assessmentId: string, rows: unknown) => {
    for (const row of Array.isArray(rows) ? rows : []) {
      const parsed = z
        .object({
          student_id: z.string(),
          value: z.nullable(z.number()).optional(),
          absent: z.boolean(),
        })
        .parse(row)
      const key = `${assessmentId}:${parsed.student_id}`
      if ((parsed.value ?? null) === null && !parsed.absent) grades.delete(key)
      else
        grades.set(key, {
          value: parsed.absent ? null : (parsed.value ?? null),
          absent: parsed.absent,
        })
    }
  }
  const saveSkillLevels = (termId: string, rows: unknown) => {
    for (const row of Array.isArray(rows) ? rows : []) {
      const parsed = z
        .object({ student_id: z.string(), skill_id: z.string(), level: z.nullable(z.string()) })
        .parse(row)
      const key = `${termId}:${parsed.student_id}:${parsed.skill_id}`
      if (parsed.level === null) skillLevels.delete(key)
      else skillLevels.set(key, parsed.level)
    }
  }
  // Bulletins (lot 7b) : appréciations, mentions, validation par la direction, PDF
  interface MockClosure {
    id: string
    closed_at: string
    closed_by: string
    reopened_at: string | null
    reopened_by: string | null
    reopen_reason: string | null
  }
  const closures = new Map<string, MockClosure[]>()
  const appreciations = new Map<
    string,
    { teacher_comment: string | null; director_comment: string | null; mention: string | null }
  >()
  const subjectComments = new Map<string, string>()
  const mentionThresholds = new Map<string, Record<string, number>>()
  const openClosure = (classroomId: string, termId: string) =>
    closures.get(`${classroomId}:${termId}`)?.find((closure) => closure.reopened_at === null)
  const isClosed = (classroomId: string, termId: string) =>
    openClosure(classroomId, termId) !== undefined
  const thresholdsOf = (cycleId: string) =>
    mentionThresholds.get(cycleId) ?? {
      congratulations: 8,
      honor_roll: 7,
      encouragement: 6,
      warning_below: 4,
    }
  const proposeMention = (average: number | null, thresholds: Record<string, number>) => {
    if (average === null) return null
    if (average >= (thresholds.congratulations ?? 8)) return 'congratulations'
    if (average >= (thresholds.honor_roll ?? 7)) return 'honor_roll'
    if (average >= (thresholds.encouragement ?? 6)) return 'encouragement'
    if (average < (thresholds.warning_below ?? 4)) return 'warning'
    return null
  }
  const reportCardsResource = (schoolId: string, classroomId: string, termId: string | null) => {
    const results = classResultsResource(schoolId, classroomId, termId)
    const classroom = gradingClassrooms(schoolId).find((candidate) => candidate.id === classroomId)
    if (results === undefined || classroom === undefined || results.term === undefined)
      return undefined
    const term = results.term
    const closure = openClosure(classroomId, term.id) ?? null
    const thresholds = thresholdsOf(classroom.cycle.id)
    const canValidate = staffHolds(schoolId, 'grades.validate', classroom.cycle.id)
    return {
      classroom: results.classroom,
      document: classroom.cycleSettings.report_document,
      grade_scale: results.grade_scale,
      terms: results.terms,
      term,
      subjects: results.subjects,
      thresholds,
      closure,
      history: [...(closures.get(`${classroomId}:${term.id}`) ?? [])].reverse(),
      rows: results.rows.map((row) => {
        const saved = appreciations.get(`${term.id}:${row.student.id}`)
        const proposed = proposeMention(row.average, thresholds)
        return {
          student: row.student,
          average: row.average,
          rank: row.rank,
          skills: row.skills,
          mention: saved?.mention ?? proposed,
          mention_proposed: proposed,
          mention_chosen: saved?.mention != null,
          teacher_comment: saved?.teacher_comment ?? null,
          director_comment: saved?.director_comment ?? null,
          subjects: row.subjects.map((cell) => ({
            ...cell,
            comment: subjectComments.get(`${term.id}:${row.student.id}:${cell.subject_id}`) ?? null,
          })),
          report_card:
            closure === null
              ? null
              : {
                  id: `${closure.id}-${row.student.id}`,
                  status: 'ready',
                  pdf_url: `/fichiers/${row.student.id}.pdf`,
                },
        }
      }),
      ready_count: closure === null ? 0 : results.rows.length,
      failed_count: 0,
      can_comment: closure === null && classroom.can_manage,
      can_validate: canValidate,
    }
  }
  const gradingSettingsResource = (schoolId: string, cycleId: string) => {
    const cycle = cyclesOf(schoolId).find((candidate) => candidate.id === cycleId)
    if (cycle === undefined) return undefined
    const year = yearsOf(schoolId).find((candidate) => candidate.is_current)
    const used = new Set(
      [...assessments.values()].flatMap((assessment) => [
        assessment.subject_id,
        assessment.term_id,
      ]),
    )
    for (const key of skillLevels.keys()) {
      const [termId = '', , skillId = ''] = key.split(':')
      used.add(termId)
      used.add(skillId)
    }
    return {
      cycle: {
        id: cycle.id,
        name: cycle.name,
        mode: cycle.settings.assessment_mode,
        term_type: cycle.settings.term_type,
        grade_scale: Number(cycle.settings.grade_scale ?? '10'),
      },
      academic_year: { id: year?.id ?? '', label: year?.label ?? '', closed: false },
      terms: termsOf(cycle.id, cycle.settings.term_type).map((term) => ({
        ...term,
        used: used.has(term.id),
      })),
      levels:
        cycle.settings.assessment_mode === 'weighted_average'
          ? cycle.levels.map((level) => ({
              id: level.id,
              name: level.name,
              subjects: subjectsOf(level.id).map((subject) => ({
                ...subject,
                used: used.has(subject.id),
              })),
            }))
          : [],
      skills:
        cycle.settings.assessment_mode === 'competency'
          ? skillsOf(cycle.id).map((skill) => ({ ...skill, used: used.has(skill.id) }))
          : [],
      mentions: thresholdsOf(cycle.id),
      can_manage: holds(schoolId, 'school.settings.manage', cycle.id),
    }
  }
  const absenceRows = (schoolId: string, date: string | null, pending: boolean) =>
    attendanceClassrooms(schoolId).flatMap((classroom) =>
      [...rollCalls.entries()]
        .filter(
          ([key]) => key.startsWith(`${classroom.id}:`) && (date === null || key.endsWith(date)),
        )
        .flatMap(([key, call]) =>
          [...call.marks.entries()].flatMap(([studentId, mark]) => {
            const student = studentsOf(schoolId).find((candidate) => candidate.id === studentId)
            if (student === undefined) return []
            if (pending && mark.justification?.status !== 'pending') return []
            return [
              {
                id: mark.id,
                date: key.slice(classroom.id.length + 1),
                status: mark.status,
                late_minutes: null,
                student: attendanceStudent(schoolId, student),
                classroom: { id: classroom.id, name: classroom.name },
                justification:
                  mark.justification === null
                    ? null
                    : {
                        id: mark.justification.id,
                        status: mark.justification.status,
                        source: mark.justification.source,
                        reason: mark.justification.reason,
                        proof_url: null,
                        submitted_by_name: mark.justification.by,
                        submitted_at: mark.justification.at,
                        decided_by_name: null,
                        decided_at: null,
                        decision_note: null,
                      },
                can_decide: staffHolds(schoolId, 'attendance.manage', classroom.cycle.id),
              },
            ]
          }),
        ),
    )
  const findMark = (markId: string) => {
    for (const call of rollCalls.values())
      for (const [studentId, mark] of call.marks)
        if (mark.id === markId || mark.justification?.id === markId) return { studentId, mark }
    return undefined
  }
  // Espace parent (lot 8b) : comme le domaine Family (GuardianChildren, ListGuardianChildren, ShowGuardianChild)
  const isGuardianHere = (schoolId: string) =>
    current?.roles.some(
      (assignment) => assignment.school === schoolKeyOf(schoolId) && assignment.role === 'guardian',
    ) ?? false
  const guardianChildren = (schoolId: string) =>
    isGuardianHere(schoolId)
      ? studentsOf(schoolId).filter((student) =>
          student.links.some(
            (link) =>
              guardiansOf(schoolId).find((guardian) => guardian.id === link.guardian_id)?.phone ===
              current?.phone,
          ),
        )
      : []
  const seededAbsences = new Set<string>()
  /** Une absence non justifiée la veille pour chaque enfant (démo : il y a toujours quelque chose à justifier). */
  const seedAbsence = (student: MockStudent) => {
    const classroomId = latestEnrollment(student)?.classroom_id
    if (classroomId === undefined || seededAbsences.has(student.id)) return
    seededAbsences.add(student.id)
    const key = `${classroomId}:2026-11-03`
    const call = rollCalls.get(key) ?? {
      by: 'Aya Enseignante',
      at: '2026-11-03T08:05:00+00:00',
      marks: new Map<string, MockMark>(),
    }
    if (!call.marks.has(student.id))
      call.marks.set(student.id, { id: nextBillingId(), status: 'absent', justification: null })
    rollCalls.set(key, call)
  }
  const childMarks = (student: MockStudent) => {
    const classroomId = latestEnrollment(student)?.classroom_id ?? ''
    return [...rollCalls.entries()]
      .filter(([key]) => key.startsWith(`${classroomId}:`))
      .flatMap(([key, call]) => {
        const mark = call.marks.get(student.id)
        if (mark === undefined) return []
        return [
          {
            id: mark.id,
            date: key.slice(classroomId.length + 1),
            status: mark.status,
            late_minutes: null,
            justification:
              mark.justification === null
                ? null
                : {
                    status: mark.justification.status,
                    reason: mark.justification.reason,
                    note: null,
                  },
            can_justify:
              mark.status === 'absent' &&
              (mark.justification === null || mark.justification.status === 'refused'),
          },
        ]
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }
  const childStudent = (schoolId: string, student: MockStudent) => {
    const found = levelOfStudent(schoolId, student)
    const row = studentRow(schoolId, student)
    return {
      id: student.id,
      full_name: row.full_name,
      first_name: student.first_name,
      matricule: student.matricule,
      photo_url: null,
      classroom:
        row.enrollment === null
          ? null
          : { id: row.enrollment.classroom_id, name: row.enrollment.classroom_name },
      cycle: found === undefined ? null : { code: found.cycle.code, name: found.cycle.name },
    }
  }
  const childInvoice = (schoolId: string, student: MockStudent) => {
    const invoice = invoicesOf(schoolId).find((candidate) => candidate.student_id === student.id)
    return invoice === undefined ? undefined : invoiceResource(schoolId, invoice)
  }
  const childSummary = (schoolId: string, student: MockStudent) => {
    seedAbsence(student)
    const classroomId = latestEnrollment(student)?.classroom_id ?? ''
    const call = rollCalls.get(`${classroomId}:${TODAY}`)
    const invoice = childInvoice(schoolId, student)
    return {
      student: childStudent(schoolId, student),
      presence: call === undefined ? null : (call.marks.get(student.id)?.status ?? 'present'),
      remaining: invoice?.balance.remaining ?? null,
      overdue: invoice?.balance.overdue ?? null,
      next_due_on: invoice?.balance.next?.due_on ?? null,
      absences_to_justify: childMarks(student).filter((mark) => mark.can_justify).length,
    }
  }
  // Messagerie et absences annoncées (lot 9a) : comme les domaines Messaging et Attendance
  interface MockPlanned {
    id: string
    studentId: string
    starts_on: string
    ends_on: string
    reason: string
    status: 'pending' | 'accepted' | 'refused'
    by: string
    at: string
  }
  interface MockMessage {
    id: string
    side: 'guardian' | 'school'
    author: string
    authorName: string
    body: string
    sentAt: string
    plannedId: string | null
  }
  interface MockConversation {
    id: string
    studentId: string
    guardianId: string
    channel: 'teacher' | 'office'
    classroomId: string
    subject: string
    messages: MockMessage[]
  }
  const plannedAbsences = new Map<string, MockPlanned[]>()
  const plannedOf = (schoolId: string): MockPlanned[] => {
    const existing = plannedAbsences.get(schoolId)
    if (existing !== undefined) return existing
    const list: MockPlanned[] = []
    plannedAbsences.set(schoolId, list)
    return list
  }
  let messageClock = 0
  /** Heure d'envoi croissante (le mock ne lit pas l'horloge du navigateur). */
  const sentNow = () => {
    messageClock += 1
    return new Date(Date.parse('2026-11-04T09:00:00Z') + messageClock * 60_000).toISOString()
  }
  const conversationsBySchool = new Map<string, MockConversation[]>()
  const reads = new Map<string, string>()
  const guardianOfStudent = (schoolId: string, student: MockStudent, phone: string) =>
    student.links
      .map((link) => guardiansOf(schoolId).find((guardian) => guardian.id === link.guardian_id))
      .find((guardian) => guardian?.phone === phone)
  const conversationsOf = (schoolId: string): MockConversation[] => {
    const existing = conversationsBySchool.get(schoolId)
    if (existing !== undefined) return existing
    const list: MockConversation[] = []
    conversationsBySchool.set(schoolId, list)
    if (schoolKeyOf(schoolId) !== 'lauriers') return list
    // Deux fils de démonstration du parent Kouadio : Ange avec sa titulaire, Junior avec l'administration
    const kids = studentsOf(schoolId).filter((student) => student.last_name === 'Kouadio')
    const seed: [string, 'teacher' | 'office', string, string, string][] = [
      [
        'Ange',
        'teacher',
        'Devoirs de la semaine',
        'Bonjour, Ange n’a pas noté ses devoirs de mathématiques.',
        'Bonjour, ce sont les exercices 3 et 4 page 27.',
      ],
      [
        'Junior',
        'office',
        'Retard du matin',
        'Junior sera en retard demain matin (rendez-vous).',
        'Bien noté, merci de nous avoir prévenus.',
      ],
    ]
    for (const [first, channel, subject, question, answer] of seed) {
      const student = kids.find((candidate) => candidate.first_name === first)
      const guardian =
        student === undefined
          ? undefined
          : guardianOfStudent(schoolId, student, ACCOUNTS.guardian.phone)
      const classroomId =
        student === undefined ? undefined : latestEnrollment(student)?.classroom_id
      if (student === undefined || guardian === undefined || classroomId === undefined) continue
      list.push({
        id: nextBillingId(),
        studentId: student.id,
        guardianId: guardian.id,
        channel,
        classroomId,
        subject,
        messages: [
          {
            id: nextBillingId(),
            side: 'guardian',
            author: ACCOUNTS.guardian.phone,
            authorName: ACCOUNTS.guardian.name,
            body: question,
            sentAt: '2026-11-03T07:30:00.000Z',
            plannedId: null,
          },
          {
            id: nextBillingId(),
            side: 'school',
            author: channel === 'teacher' ? ACCOUNTS.teacher.phone : ACCOUNTS.director.phone,
            authorName: channel === 'teacher' ? ACCOUNTS.teacher.name : ACCOUNTS.director.name,
            body: answer,
            sentAt: '2026-11-03T08:10:00.000Z',
            plannedId: null,
          },
        ],
      })
    }
    return list
  }
  const isGuardianOfConversation = (schoolId: string, conversation: MockConversation) =>
    isGuardianHere(schoolId) &&
    guardiansOf(schoolId).find((guardian) => guardian.id === conversation.guardianId)?.phone ===
      current?.phone
  const isHomeroomOfConversation = (schoolId: string, conversation: MockConversation) => {
    const classroom = classroomsOf(schoolId).find(
      (candidate) => candidate.id === conversation.classroomId,
    )
    return classroom !== undefined && isHomeroom(classroom)
  }
  const isOfficeOf = (schoolId: string, conversation: MockConversation) =>
    staffHolds(schoolId, 'messaging.send', cycleOfClassroom(schoolId, conversation.classroomId))
  const canReadConversation = (schoolId: string, conversation: MockConversation) =>
    isGuardianOfConversation(schoolId, conversation) ||
    isOfficeOf(schoolId, conversation) ||
    (conversation.channel === 'teacher' && isHomeroomOfConversation(schoolId, conversation))
  const canWriteConversation = (schoolId: string, conversation: MockConversation) =>
    isGuardianOfConversation(schoolId, conversation) ||
    (conversation.channel === 'teacher'
      ? isHomeroomOfConversation(schoolId, conversation)
      : isOfficeOf(schoolId, conversation))
  const plannedBrief = (schoolId: string, plannedId: string | null) => {
    const planned = plannedOf(schoolId).find((candidate) => candidate.id === plannedId)
    return planned === undefined
      ? null
      : {
          id: planned.id,
          starts_on: planned.starts_on,
          ends_on: planned.ends_on,
          status: planned.status,
        }
  }
  const conversationResource = (schoolId: string, conversation: MockConversation) => {
    const side = isGuardianOfConversation(schoolId, conversation) ? 'guardian' : 'school'
    const readAt = reads.get(`${conversation.id}:${current?.phone ?? ''}`) ?? ''
    const student = studentsOf(schoolId).find(
      (candidate) => candidate.id === conversation.studentId,
    )
    const guardian = guardiansOf(schoolId).find(
      (candidate) => candidate.id === conversation.guardianId,
    )
    const classroom = classroomsOf(schoolId).find(
      (candidate) => candidate.id === conversation.classroomId,
    )
    const last = conversation.messages[conversation.messages.length - 1]
    return {
      id: conversation.id,
      channel: conversation.channel,
      subject: conversation.subject,
      student: {
        id: conversation.studentId,
        full_name: student === undefined ? '' : fullName(student),
        first_name: student?.first_name ?? '',
      },
      classroom: {
        id: conversation.classroomId,
        name: classroom === undefined ? '' : classroomResource(schoolId, classroom).name,
      },
      guardian: {
        id: conversation.guardianId,
        name: guardian?.name ?? '',
        phone: side === 'school' ? (guardian?.phone ?? null) : null,
      },
      last_message:
        last === undefined
          ? null
          : {
              side: last.side,
              author_name: last.authorName,
              preview: last.body.slice(0, 140),
              sent_at: last.sentAt,
            },
      last_message_at: last?.sentAt ?? '',
      unread: conversation.messages.filter(
        (message) => message.side !== side && message.sentAt > readAt,
      ).length,
      side,
      can_write: canWriteConversation(schoolId, conversation),
    }
  }
  const conversationDetail = (schoolId: string, conversation: MockConversation) => ({
    conversation: conversationResource(schoolId, conversation),
    messages: conversation.messages.map((message) => ({
      id: message.id,
      side: message.side,
      author_name: message.authorName,
      body: message.body,
      sent_at: message.sentAt,
      mine: message.author === current?.phone,
      planned_absence: plannedBrief(schoolId, message.plannedId),
    })),
  })
  const postMessage = (
    schoolId: string,
    conversation: MockConversation,
    body: string,
    plannedId: string | null = null,
  ) => {
    const sentAt = sentNow()
    conversation.messages.push({
      id: nextBillingId(),
      side: isGuardianOfConversation(schoolId, conversation) ? 'guardian' : 'school',
      author: current?.phone ?? '',
      authorName: current?.name ?? '',
      body,
      sentAt,
      plannedId,
    })
    reads.set(`${conversation.id}:${current?.phone ?? ''}`, sentAt)
  }
  /** Comme StartConversation : fil existant (enfant, tuteur, destinataire) ou nouveau. */
  const startConversation = (
    schoolId: string,
    student: MockStudent,
    channel: 'teacher' | 'office',
    subject: string,
    guardianId: string | null,
  ): MockConversation | number => {
    const mine = guardianOfStudent(schoolId, student, current?.phone ?? '')
    const asGuardian = isGuardianHere(schoolId) && mine !== undefined
    const target = asGuardian ? mine.id : guardianId
    if (target === null || !student.links.some((link) => link.guardian_id === target)) return 404
    const classroomId = latestEnrollment(student)?.classroom_id
    if (classroomId === undefined) return 409
    const classroom = classroomsOf(schoolId).find((candidate) => candidate.id === classroomId)
    if (channel === 'teacher' && classroom?.homeroom_teacher_id == null) return 409
    const list = conversationsOf(schoolId)
    const existing = list.find(
      (candidate) =>
        candidate.studentId === student.id &&
        candidate.guardianId === target &&
        candidate.channel === channel,
    )
    const conversation = existing ?? {
      id: nextBillingId(),
      studentId: student.id,
      guardianId: target,
      channel,
      classroomId,
      subject,
      messages: [],
    }
    if (!asGuardian && !canWriteConversation(schoolId, conversation)) return 403
    if (existing === undefined) list.push(conversation)
    return conversation
  }
  const visibleConversations = (schoolId: string) =>
    conversationsOf(schoolId)
      .filter((conversation) => canReadConversation(schoolId, conversation))
      .map((conversation) => conversationResource(schoolId, conversation))
      .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
  /** Absence annoncée non refusée qui couvre ce jour (comme PlannedAbsences::covering). */
  const plannedOn = (schoolId: string, studentId: string, date: string) =>
    plannedOf(schoolId).find(
      (planned) =>
        planned.studentId === studentId &&
        planned.status !== 'refused' &&
        planned.starts_on <= date &&
        date <= planned.ends_on,
    )
  const justifyFromPlanned = (planned: MockPlanned, mark: MockMark) => {
    if (mark.status !== 'absent' || mark.justification !== null) return
    mark.justification = {
      id: nextBillingId(),
      status: planned.status,
      source: 'guardian',
      reason: planned.reason,
      by: planned.by,
      at: planned.at,
      plannedId: planned.id,
    }
  }
  const plannedResource = (schoolId: string, planned: MockPlanned) => {
    const student = studentsOf(schoolId).find((candidate) => candidate.id === planned.studentId)
    const classroom = attendanceClassrooms(schoolId).find(
      (candidate) =>
        candidate.id === (student === undefined ? '' : latestEnrollment(student)?.classroom_id),
    )
    if (student === undefined || classroom === undefined) return undefined
    return {
      id: planned.id,
      student: attendanceStudent(schoolId, student),
      classroom: { id: classroom.id, name: classroom.name },
      starts_on: planned.starts_on,
      ends_on: planned.ends_on,
      reason: planned.reason,
      status: planned.status,
      submitted_by_name: planned.by,
      submitted_at: planned.at,
      decided_by_name: null,
      decided_at: null,
      decision_note: null,
      can_decide: staffHolds(schoolId, 'attendance.manage', classroom.cycle.id),
    }
  }
  // Annonces et calendrier (lot 9b) : comme AudienceScope, AnnouncementAccess et CalendarAccess
  interface MockAnnouncement {
    id: string
    title: string
    body: string
    audience: 'school' | 'cycle' | 'classroom'
    cycleId: string | null
    classroomId: string | null
    reach: number
    authorName: string
    publishedAt: string
  }
  interface MockEvent {
    id: string
    title: string
    kind: 'holiday' | 'exam' | 'meeting' | 'event' | 'training'
    starts_on: string
    ends_on: string
    cycleId: string | null
    location: string | null
  }
  const announcementsBySchool = new Map<string, MockAnnouncement[]>()
  const eventsBySchool = new Map<string, MockEvent[]>()
  const announcementsOf = (schoolId: string): MockAnnouncement[] => {
    const existing = announcementsBySchool.get(schoolId)
    if (existing !== undefined) return existing
    const list: MockAnnouncement[] =
      schoolKeyOf(schoolId) === 'lauriers'
        ? [
            {
              id: nextBillingId(),
              title: 'Kermesse de fin de trimestre',
              body: 'Rendez-vous samedi 19 décembre à 9 h dans la cour. Stands, jeux et spectacle des enfants.',
              audience: 'school',
              cycleId: null,
              classroomId: null,
              reach: studentsOf(schoolId).length,
              authorName: ACCOUNTS.director.name,
              publishedAt: '2026-11-02T10:00:00+00:00',
            },
          ]
        : []
    announcementsBySchool.set(schoolId, list)
    return list
  }
  const eventsOf = (schoolId: string): MockEvent[] => {
    const existing = eventsBySchool.get(schoolId)
    if (existing !== undefined) return existing
    const list: MockEvent[] =
      schoolKeyOf(schoolId) === 'lauriers'
        ? [
            {
              id: nextBillingId(),
              title: 'Réunion parents-enseignants',
              kind: 'meeting',
              starts_on: '2026-11-12',
              ends_on: '2026-11-12',
              cycleId: CYCLE_PRIMARY,
              location: 'Salle polyvalente',
            },
            {
              id: nextBillingId(),
              title: 'Congés de Noël',
              kind: 'holiday',
              starts_on: '2026-12-19',
              ends_on: '2027-01-04',
              cycleId: null,
              location: null,
            },
          ]
        : []
    eventsBySchool.set(schoolId, list)
    return list
  }
  /** Portée de lecture du compte courant (AudienceScope). */
  const audienceScope = (schoolId: string) => {
    const schoolKey = schoolKeyOf(schoolId)
    const scope = {
      staffAll: false,
      staffCycles: new Set<string>(),
      cycles: new Set<string>(),
      classrooms: new Set<string>(),
    }
    for (const assignment of current?.roles ?? []) {
      if (assignment.school !== schoolKey) continue
      if (assignment.role === 'guardian') continue
      if (assignment.role === 'teacher') {
        if (assignment.cycle !== undefined) scope.cycles.add(assignment.cycle)
        continue
      }
      if (assignment.cycle === undefined) scope.staffAll = true
      else {
        scope.staffCycles.add(assignment.cycle)
        scope.cycles.add(assignment.cycle)
      }
    }
    for (const classroom of classroomsOf(schoolId)) {
      if (classroom.homeroom_teacher_id === userId(current?.phone ?? '-')) {
        scope.classrooms.add(classroom.id)
        const cycle = cycleOfClassroom(schoolId, classroom.id)
        if (cycle !== null) scope.cycles.add(cycle)
      }
    }
    for (const child of guardianChildren(schoolId)) {
      const classroomId = latestEnrollment(child)?.classroom_id
      if (classroomId === undefined) continue
      scope.classrooms.add(classroomId)
      const cycle = cycleOfClassroom(schoolId, classroomId)
      if (cycle !== null) scope.cycles.add(cycle)
    }
    return scope
  }
  const canPublish = (
    schoolId: string,
    audience: 'school' | 'cycle' | 'classroom',
    cycleId: string | null,
    classroomId: string | null,
  ) => {
    if (audience === 'school')
      return (
        staffHolds(schoolId, 'messaging.announce', null) &&
        current?.roles.some(
          (assignment) =>
            assignment.school === schoolKeyOf(schoolId) &&
            assignment.cycle === undefined &&
            PERMISSIONS['messaging.announce']?.includes(assignment.role) === true,
        ) === true
      )
    if (audience === 'cycle')
      return cycleId !== null && staffHolds(schoolId, 'messaging.announce', cycleId)
    const classroom = classroomsOf(schoolId).find((candidate) => candidate.id === classroomId)
    if (classroom === undefined) return false
    return (
      staffHolds(schoolId, 'messaging.announce', cycleOfClassroom(schoolId, classroom.id)) ||
      isHomeroom(classroom)
    )
  }
  const announcementVisible = (schoolId: string, announcement: MockAnnouncement) => {
    const scope = audienceScope(schoolId)
    if (announcement.audience === 'school' || scope.staffAll) return true
    if (announcement.audience === 'cycle') return scope.cycles.has(announcement.cycleId ?? '')
    return (
      scope.staffCycles.has(announcement.cycleId ?? '') ||
      scope.classrooms.has(announcement.classroomId ?? '')
    )
  }
  const announcementResource = (schoolId: string, announcement: MockAnnouncement) => {
    const cycle = cyclesOf(schoolId).find((candidate) => candidate.id === announcement.cycleId)
    const classroom = classroomsOf(schoolId).find(
      (candidate) => candidate.id === announcement.classroomId,
    )
    return {
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      audience: announcement.audience,
      cycle: cycle === undefined ? null : { id: cycle.id, code: cycle.code, name: cycle.name },
      classroom:
        classroom === undefined
          ? null
          : { id: classroom.id, name: classroomResource(schoolId, classroom).name },
      author_name: announcement.authorName,
      published_at: announcement.publishedAt,
      reach: announcement.reach,
      can_delete: canPublish(
        schoolId,
        announcement.audience,
        announcement.cycleId,
        announcement.classroomId,
      ),
    }
  }
  const canManageEvent = (schoolId: string, cycleId: string | null) =>
    current?.roles.some(
      (assignment) =>
        assignment.school === schoolKeyOf(schoolId) &&
        assignment.role !== 'teacher' &&
        assignment.role !== 'guardian' &&
        (assignment.cycle === undefined || (cycleId !== null && assignment.cycle === cycleId)) &&
        PERMISSIONS['school.settings.manage']?.includes(assignment.role) === true,
    ) === true
  const eventResource = (schoolId: string, event: MockEvent) => {
    const cycle = cyclesOf(schoolId).find((candidate) => candidate.id === event.cycleId)
    return {
      id: event.id,
      title: event.title,
      kind: event.kind,
      starts_on: event.starts_on,
      ends_on: event.ends_on,
      cycle: cycle === undefined ? null : { id: cycle.id, code: cycle.code, name: cycle.name },
      location: event.location,
      can_manage: canManageEvent(schoolId, event.cycleId),
    }
  }
  const eventVisible = (schoolId: string, event: MockEvent) => {
    const scope = audienceScope(schoolId)
    return event.cycleId === null || scope.staffAll || scope.cycles.has(event.cycleId)
  }
  const intentResource = (schoolId: string, intent: MockIntent) => ({
    id: intent.id,
    status: intent.status,
    method: intent.method,
    phone: `${intent.phone.slice(0, 4)}********${intent.phone.slice(-2)}`,
    amount: intent.amount,
    fee: intent.fee,
    charged: intent.charged,
    fee_payer: intent.feePayer,
    failure_reason: intent.failureReason,
    payment_id: intent.paymentId,
    receipt_number:
      paymentsOf(schoolId).find((payment) => payment.id === intent.paymentId)?.receipt_number ??
      null,
    expires_at: '2026-11-04T10:00:00+00:00',
    created_at: '2026-11-04T09:30:00+00:00',
  })
  const childResource = (schoolId: string, student: MockStudent, termId: string | null) => {
    seedAbsence(student)
    const found = levelOfStudent(schoolId, student)
    const classroomId = latestEnrollment(student)?.classroom_id ?? ''
    const mode = found?.cycle.settings.assessment_mode ?? 'weighted_average'
    const scale = Number(found?.cycle.settings.grade_scale ?? '10')
    const terms = found === undefined ? [] : termsOf(found.cycle.id, found.cycle.settings.term_type)
    const term = pickTerm(terms, termId) ?? null
    if (found !== undefined) seedGrid(schoolId, classroomId, found.level.id, terms)
    const subjects =
      mode === 'weighted_average' && found !== undefined
        ? subjectsOf(found.level.id).map((subject) => {
            const list = [...assessments.values()]
              .filter(
                (assessment) =>
                  assessment.classroom_id === classroomId &&
                  assessment.subject_id === subject.id &&
                  assessment.term_id === term?.id,
              )
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((assessment) => ({
                id: assessment.id,
                title: assessment.title,
                date: assessment.date,
                out_of: assessment.out_of,
                ...(grades.get(`${assessment.id}:${student.id}`) ?? { value: null, absent: false }),
              }))
            const scores = list.flatMap((item) =>
              item.value === null || item.absent ? [] : [(item.value / item.out_of) * scale],
            )
            return {
              id: subject.id,
              name: subject.name,
              coefficient: subject.coefficient,
              average:
                scores.length === 0
                  ? null
                  : Math.round(
                      (scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100,
                    ) / 100,
              assessments: list,
            }
          })
        : []
    const skills =
      mode === 'competency' && found !== undefined
        ? skillsOf(found.cycle.id).map((skill) => ({
            id: skill.id,
            domain: skill.domain,
            label: skill.label,
            level: skillLevels.get(`${term?.id ?? ''}:${student.id}:${skill.id}`) ?? null,
          }))
        : []
    const invoice = childInvoice(schoolId, student)
    return {
      student: childStudent(schoolId, student),
      assessment_mode: mode,
      grade_scale: scale,
      terms,
      term,
      subjects,
      skills,
      report_cards: terms.flatMap((candidate) => {
        const closure = openClosure(classroomId, candidate.id)
        return closure === undefined
          ? []
          : [
              {
                id: `${closure.id}-${student.id}`,
                term: candidate.label,
                validated_at: closure.closed_at,
                pdf_url: `/fichiers/${student.id}.pdf`,
              },
            ]
      }),
      absences: childMarks(student),
      balance:
        invoice === undefined
          ? null
          : {
              total: invoice.total,
              settled: invoice.balance.settled,
              remaining: invoice.balance.remaining,
              overdue: invoice.balance.overdue,
              next: invoice.balance.next,
              schedule: invoice.schedule.map(({ due_on, label, amount, settled }) => ({
                due_on,
                label,
                amount,
                settled,
              })),
            },
      payments:
        invoice?.payments.map((payment) => ({
          id: payment.id,
          receipt_number: payment.receipt_number,
          amount: payment.amount,
          method: payment.method,
          paid_at: payment.paid_at,
          cancelled: payment.cancellation !== null,
        })) ?? [],
      mobile_money: { available: true, ...feesOf(schoolId) },
      planned_absences: plannedOf(schoolId)
        .filter((planned) => planned.studentId === student.id)
        .map((planned) => ({
          id: planned.id,
          starts_on: planned.starts_on,
          ends_on: planned.ends_on,
          reason: planned.reason,
          status: planned.status,
          note: null,
        })),
    }
  }
  const daycareBoard = (schoolId: string) => ({
    date: TODAY,
    classrooms: attendanceClassrooms(schoolId)
      .filter((classroom) => classroom.mode === 'check_in_out')
      .map((classroom) => ({
        id: classroom.id,
        name: classroom.name,
        can_record: classroom.can_take,
        children: rosterOf(schoolId, classroom.id).map((student) => ({
          student: attendanceStudent(schoolId, student),
          visit: daycare.get(student.id)?.visit ?? null,
          logs: daycare.get(student.id)?.logs ?? [],
        })),
      })),
  })
  const recordDaycare = (
    studentId: string,
    input:
      | { kind: 'check'; direction: string; time: string; person: string | null }
      | { kind: 'log'; time: string; logKind: string; note: string },
  ) => {
    const entry = daycare.get(studentId) ?? { visit: null, logs: [] }
    if (input.kind === 'check') {
      const visit = entry.visit ?? {
        arrived_at: null,
        left_at: null,
        dropped_by: null,
        picked_up_by: null,
      }
      entry.visit =
        input.direction === 'in'
          ? { ...visit, arrived_at: input.time, dropped_by: input.person }
          : { ...visit, left_at: input.time, picked_up_by: input.person }
    } else {
      entry.logs.push({
        id: nextBillingId(),
        time: input.time,
        kind: input.logKind,
        note: input.note,
      })
    }
    daycare.set(studentId, entry)
  }
  const attendanceSummary = (schoolId: string) => {
    if (!cyclesOf(schoolId).some((cycle) => staffHolds(schoolId, 'attendance.view', cycle.id)))
      return null
    const callClasses = attendanceClassrooms(schoolId).filter(
      (classroom) => classroom.mode === 'roll_call',
    )
    const today = absenceRows(schoolId, TODAY, false)
    return {
      absent_today: today.filter((row) => row.status === 'absent').length,
      late_today: today.filter((row) => row.status === 'late').length,
      roll_calls_missing: callClasses.filter(
        (classroom) => !rollCalls.has(`${classroom.id}:${TODAY}`),
      ).length,
      rates: [
        { date: '2026-11-02', rate: 97 },
        { date: '2026-11-03', rate: 95 },
        { date: TODAY, rate: 96 },
      ],
    }
  }
  const reminders = new Map<string, { at: string; status: string }>()
  /** Comme ListUnpaid : factures dont l'échu au 04/11/2026 n'est pas réglé, le plus gros retard d'abord. */
  const unpaidRows = (schoolId: string) =>
    invoicesOf(schoolId)
      .flatMap((invoice) => {
        const student = studentsOf(schoolId).find(
          (candidate) => candidate.id === invoice.student_id,
        )
        if (student === undefined || !canSee(schoolId, student, 'billing.view')) return []
        const resource = invoiceResource(schoolId, invoice)
        if (resource.balance.overdue <= 0) return []
        const row = studentRow(schoolId, student)
        const found = levelOfStudent(schoolId, student)
        const oldest =
          resource.schedule.find(
            (item) => item.due_on <= '2026-11-04' && item.settled < item.amount,
          )?.due_on ?? '2026-11-04'
        const payerName = resource.payer?.name ?? null
        return [
          {
            invoice_id: invoice.id,
            student: {
              id: student.id,
              full_name: row.full_name,
              first_name: student.first_name,
              matricule: student.matricule,
            },
            classroom_name: row.enrollment?.classroom_name ?? '',
            cycle: { id: found?.cycle.id ?? '', code: found?.cycle.code ?? '' },
            academic_year_label: '2026-2027',
            payer:
              payerName === null
                ? null
                : { name: payerName, phone: row.primary_contact?.phone ?? null },
            overdue: resource.balance.overdue,
            remaining: resource.balance.remaining,
            oldest_due_on: oldest,
            days_late: Math.round((Date.parse('2026-11-04') - Date.parse(oldest)) / 86_400_000),
            last_reminder: reminders.get(`${schoolId}:${payerName ?? ''}`) ?? null,
            can_remind: resource.can_collect,
          },
        ]
      })
      .sort((a, b) => b.overdue - a.overdue)
  const studentOfInvoice = (schoolId: string, invoiceId: string) => {
    const invoice = invoicesOf(schoolId).find((candidate) => candidate.id === invoiceId)
    return studentsOf(schoolId).find((candidate) => candidate.id === invoice?.student_id)
  }
  const receiptResource = (schoolId: string, payment: MockPayment) => {
    const student = studentOfInvoice(schoolId, payment.invoice_id)
    const invoice = invoicesOf(schoolId).find((candidate) => candidate.id === payment.invoice_id)
    const row = student === undefined ? undefined : studentRow(schoolId, student)
    const profile = schoolProfileOf(schoolId)
    const cycleId =
      student === undefined ? null : (levelOfStudent(schoolId, student)?.cycle.id ?? null)
    return {
      payment: paymentResource(payment),
      student: {
        id: student?.id ?? '',
        full_name: row?.full_name ?? '',
        matricule: student?.matricule ?? '',
      },
      classroom_name: row?.enrollment?.classroom_name ?? '',
      academic_year_label: '2026-2027',
      remaining: invoice === undefined ? 0 : invoiceResource(schoolId, invoice).balance.remaining,
      school: {
        name: profile.name,
        city: profile.city,
        address: profile.address,
        phone: profile.phone,
        email: profile.email,
        logo_url: profile.logo_url,
      },
      can_cancel: payment.cancellation === null && holds(schoolId, 'billing.cancel', cycleId),
    }
  }
  /** Caisse du jour : une session par caissier (téléphone), comme CashSessionResource. */
  const cashDeskResource = (schoolId: string, date: string) => {
    const allCashiers = holds(schoolId, 'billing.manage', null)
    const byCashier = new Map<string, MockPayment[]>()
    for (const payment of paymentsOf(schoolId).filter((candidate) =>
      candidate.paid_at.startsWith(date),
    )) {
      if (!allCashiers && payment.cashier_phone !== current?.phone) continue
      byCashier.set(payment.cashier_phone, [
        ...(byCashier.get(payment.cashier_phone) ?? []),
        payment,
      ])
    }
    const sessions = [...byCashier.entries()].map(([phone, list]) => {
      const sessionId = `cash-${schoolId.slice(-4)}-${phone.slice(-4)}-${date}`
      const closed = closedSessions.get(sessionId)
      const methods = [...new Set(list.map((payment) => payment.method))].map((method) => {
        const rows = list.filter((payment) => payment.method === method)
        const collected = rows.reduce((sum, payment) => sum + payment.amount, 0)
        const cancelled = rows
          .filter((payment) => payment.cancellation !== null)
          .reduce((sum, payment) => sum + payment.amount, 0)
        return {
          method,
          collected,
          cancelled,
          refunded: 0,
          net: collected - cancelled,
          count: rows.length,
        }
      })
      const expected = methods.find((row) => row.method === 'cash')?.net ?? 0
      return {
        id: sessionId,
        cashier_name: list[0]?.cashier_name ?? '',
        is_mine: phone === current?.phone,
        business_date: date,
        closed_at: closed?.closed_at ?? null,
        expected_cash: expected,
        counted_cash: closed?.counted ?? null,
        difference: closed === undefined ? null : closed.counted - expected,
        note: closed?.note ?? null,
        net_total: methods.reduce((sum, row) => sum + row.net, 0),
        methods,
        movements: list
          .flatMap((payment) => {
            const owner = studentOfInvoice(schoolId, payment.invoice_id)
            const studentName = owner === undefined ? '' : studentRow(schoolId, owner).full_name
            const base = {
              kind: 'payment',
              at: payment.paid_at,
              number: payment.receipt_number,
              amount: payment.amount,
              method: payment.method,
              student_name: studentName,
              payment_id: payment.id,
              reason: null,
              cancelled: payment.cancellation !== null,
            }
            return payment.cancellation === null
              ? [base]
              : [
                  base,
                  {
                    ...base,
                    kind: 'cancellation',
                    at: payment.cancellation.cancelled_at,
                    amount: -payment.amount,
                    reason: payment.cancellation.reason,
                    cancelled: false,
                  },
                ]
          })
          .sort((a, b) => b.at.localeCompare(a.at)),
      }
    })
    return {
      date,
      all_cashiers: allCashiers,
      net_total: sessions.reduce((sum, session) => sum + session.net_total, 0),
      sessions: sessions.sort((a, b) => Number(b.is_mine) - Number(a.is_mine)),
    }
  }
  const gridResource = (schoolId: string) => ({
    academic_year: { id: yearsOf(schoolId)[0]?.id ?? '', label: '2026-2027', status: 'open' },
    fee_types: FEE_TYPES,
    cycles: cyclesOf(schoolId)
      .filter((cycle) => holds(schoolId, 'billing.view', cycle.id))
      .map((cycle) => ({
        id: cycle.id,
        code: cycle.code,
        name: cycle.name,
        billing_period: cycle.settings.billing_period,
        can_manage: holds(schoolId, 'billing.manage', cycle.id),
        dates: calendarOf(schoolId, cycle.id).map((date, position) => ({
          position,
          due_on: date.due_on,
          label: date.label,
        })),
        levels: cycle.levels.map((level) => ({
          id: level.id,
          code: level.code,
          name: level.name,
          amounts: FEE_TYPES.flatMap((type) => {
            const amount = gridOf(schoolId).get(`${level.id}:${type.id}`) ?? 0
            return amount === 0 ? [] : [{ fee_type_id: type.id, amount }]
          }),
        })),
      })),
    pending_invoices: studentsOf(schoolId).filter(
      (student) => !invoicesOf(schoolId).some((invoice) => invoice.student_id === student.id),
    ).length,
  })
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
            options: z.optional(z.array(z.string())),
            student: studentBody,
            guardians: z.array(guardianBody),
            pre_registration_id: z.optional(z.nullable(z.string())),
          })
          .parse(request.postDataJSON())
        const preRegistration =
          body.pre_registration_id == null
            ? undefined
            : preRegistrationsOf(schoolId).find(
                (candidate) => candidate.id === body.pre_registration_id,
              )
        if (body.pre_registration_id != null && preRegistration?.status !== 'pending') {
          return route.fulfill({
            status: 422,
            json: {
              message: 'Pré-inscription introuvable.',
              errors: { pre_registration_id: ['Pré-inscription introuvable.'] },
            },
          })
        }
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
        invoicesOf(schoolId)
        createInvoice(schoolId, student, body.options ?? [], '2026-11-04')
        if (preRegistration !== undefined)
          Object.assign(preRegistration, {
            status: 'enrolled',
            decided_by_name: current?.name ?? '',
            decided_at: '2026-11-07T10:00:00+00:00',
            student_id: student.id,
            notification_status: 'failed',
            notification_failure: 'Aucun fournisseur SMS n’est configuré.',
          })
        return route.fulfill({ status: 201, json: { data: studentFile(schoolId, student) } })
      }
      case 'GET /billing/grid': {
        const schoolId = schoolHeader ?? ''
        if (!cyclesOf(schoolId).some((cycle) => holds(schoolId, 'billing.view', cycle.id)))
          return route.fulfill(forbidden)
        return route.fulfill({ json: { data: gridResource(schoolId) } })
      }
      case 'PUT /billing/grid': {
        const schoolId = schoolHeader ?? ''
        const body = z
          .object({
            amounts: z.array(
              z.object({ level_id: z.string(), fee_type_id: z.string(), amount: z.number() }),
            ),
          })
          .parse(request.postDataJSON())
        for (const entry of body.amounts) {
          const found = cyclesOf(schoolId)
            .flatMap((cycle) => cycle.levels.map((level) => ({ level, cycle })))
            .find((candidate) => candidate.level.id === entry.level_id)
          if (found === undefined || !holds(schoolId, 'billing.manage', found.cycle.id))
            return route.fulfill(forbidden)
          if (!Number.isInteger(entry.amount) || entry.amount < 0)
            return route.fulfill({
              status: 422,
              json: {
                message: 'Montant invalide.',
                errors: { 'amounts.0.amount': ['Montant invalide.'] },
              },
            })
          if (entry.amount === 0) gridOf(schoolId).delete(`${entry.level_id}:${entry.fee_type_id}`)
          else gridOf(schoolId).set(`${entry.level_id}:${entry.fee_type_id}`, entry.amount)
        }
        return route.fulfill({ json: { data: gridResource(schoolId) } })
      }
      case 'POST /billing/invoices/generate': {
        const schoolId = schoolHeader ?? ''
        const pending = studentsOf(schoolId).filter(
          (student) => !invoicesOf(schoolId).some((invoice) => invoice.student_id === student.id),
        )
        for (const student of pending) createInvoice(schoolId, student, [], '2026-11-04')
        return route.fulfill({ json: { created: pending.length } })
      }
      case 'GET /billing/schedules': {
        const schoolId = schoolHeader ?? ''
        const byDate = new Map<
          string,
          { due_on: string; label: string; expected: number; invoices: Set<string> }
        >()
        for (const invoice of invoicesOf(schoolId))
          for (const line of invoice.lines)
            for (const item of line.installments) {
              const row = byDate.get(item.due_on) ?? {
                due_on: item.due_on,
                label: item.label,
                expected: 0,
                invoices: new Set<string>(),
              }
              row.expected += item.amount
              row.invoices.add(invoice.id)
              byDate.set(item.due_on, row)
            }
        return route.fulfill({
          json: {
            data: [...byDate.values()]
              .sort((a, b) => a.due_on.localeCompare(b.due_on))
              .map((row) => ({
                due_on: row.due_on,
                label: row.label,
                expected: row.expected,
                invoices: row.invoices.size,
              })),
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
        const raw = z.record(z.string(), z.unknown()).parse(request.postDataJSON())
        const profile = schoolProfileOf(schoolId)
        if (typeof raw.public_fees === 'boolean') profile.public_fees = raw.public_fees
        const body = z
          .record(z.string(), z.nullable(z.string()))
          .parse(Object.fromEntries(Object.entries(raw).filter(([key]) => key !== 'public_fees')))
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
        if (path.startsWith('/public/schools/')) {
          const [, , , slug = '', sub] = path.split('/')
          const school = Object.values(SCHOOLS).find((candidate) => candidate.slug === slug)
          if (school === undefined)
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          const publicCycles = slug === 'petits-genies' ? CYCLES.slice(0, 2) : CYCLES
          if (sub === 'fees' && request.method() === 'GET') {
            // Comme ShowPublicFees : la grille de l'année en cours si l'école la publie
            if (!schoolProfileOf(school.id).public_fees)
              return route.fulfill({ json: { data: null } })
            const used = FEE_TYPES.filter((type) =>
              publicCycles.some((cycle) =>
                cycle.levels.some(
                  (level) => (gridOf(school.id).get(`${level.id}:${type.id}`) ?? 0) > 0,
                ),
              ),
            )
            return route.fulfill({
              json: {
                data: {
                  year_label: '2026-2027',
                  fee_types: used.map((type) => ({
                    code: type.code,
                    name: type.name,
                    optional: type.is_optional,
                  })),
                  levels: publicCycles.flatMap((cycle) =>
                    cycle.levels.map((level) => ({
                      cycle_name: cycle.name,
                      level_code: level.code,
                      level_name: level.name,
                      amounts: Object.fromEntries(
                        used.flatMap((type) => {
                          const amount = gridOf(school.id).get(`${level.id}:${type.id}`) ?? 0
                          return amount > 0 ? [[type.code, amount]] : []
                        }),
                      ),
                    })),
                  ),
                },
              },
            })
          }
          if (sub === 'pre-registrations' && request.method() === 'POST') {
            const body = z
              .object({
                cycle_code: z.string(),
                level_code: z.string(),
                child_last_name: z.string(),
                child_first_name: z.string(),
                child_gender: z.enum(['F', 'M']),
                child_birth_date: z.string(),
                guardian_name: z.string(),
                guardian_phone: z.string(),
                guardian_email: z.optional(z.nullable(z.string())),
                message: z.optional(z.nullable(z.string())),
                consent: z.optional(z.unknown()),
                website: z.optional(z.string()),
              })
              .parse(request.postDataJSON())
            const level = publicCycles
              .find((cycle) => cycle.code === body.cycle_code)
              ?.levels.find((candidate) => candidate.code === body.level_code)
            const phone = phoneOf(body.guardian_phone)
            const errors: Record<string, string[]> = {}
            if (level === undefined)
              errors.level_code = ['Ce niveau n’est pas proposé par l’école.']
            if (phone === null) errors.guardian_phone = ['Saisissez un numéro de téléphone valide.']
            if (body.website !== undefined) errors.website = ['Le champ website est interdit.']
            if (level === undefined || phone === null || Object.keys(errors).length > 0)
              return route.fulfill({ status: 422, json: { message: 'Données invalides.', errors } })
            const list = preRegistrationsOf(school.id)
            const same = list.find(
              (candidate) =>
                candidate.status === 'pending' &&
                candidate.guardian.phone === phone &&
                candidate.child.birth_date === body.child_birth_date &&
                candidate.child.first_name.toLowerCase() === body.child_first_name.toLowerCase(),
            )
            if (same !== undefined)
              return route.fulfill({ status: 201, json: { data: { reference: same.reference } } })
            const cycle = publicCycles.find((candidate) => candidate.code === body.cycle_code)
            const created: MockPreRegistration = {
              id: `0195f000-0000-7000-8000-00000000f${String(list.length + 1).padStart(3, '0')}`,
              reference: `PRE-2026-${String(list.length + 1).padStart(6, '0')}`,
              status: 'pending',
              created_at: '2026-11-07T09:00:00+00:00',
              child: {
                last_name: body.child_last_name,
                first_name: body.child_first_name,
                gender: body.child_gender,
                birth_date: body.child_birth_date,
              },
              level: {
                id: level.id,
                name: level.name,
                cycle_id: cycle?.id ?? '',
                cycle_name: cycle?.name ?? '',
              },
              guardian: { name: body.guardian_name, phone, email: body.guardian_email ?? null },
              message: body.message ?? null,
              decided_by_name: null,
              decided_at: null,
              decision_note: null,
              student_id: null,
              notification_status: null,
              notification_failure: null,
            }
            list.unshift(created)
            return route.fulfill({ status: 201, json: { data: { reference: created.reference } } })
          }
          if (request.method() !== 'GET' || sub !== undefined)
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          const cycles = publicCycles.map((cycle) => ({
            code: cycle.code,
            name: cycle.name,
            levels: cycle.levels.map((level) => ({ code: level.code, name: level.name })),
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
        if (path === '/pre-registrations' || path.startsWith('/pre-registrations/')) {
          const schoolId = schoolHeader ?? ''
          // Comme PreRegistrationAccess : students.manage au titre du personnel, sur le cycle du niveau
          const sees = (candidate: MockPreRegistration) =>
            holds(schoolId, 'students.manage', candidate.level.cycle_id)
          if (path === '/pre-registrations' && request.method() === 'GET') {
            if (!cyclesOf(schoolId).some((cycle) => holds(schoolId, 'students.manage', cycle.id)))
              return route.fulfill(forbidden)
            const status = new URL(request.url()).searchParams.get('status')
            return route.fulfill({
              json: {
                data: preRegistrationsOf(schoolId).filter(
                  (candidate) =>
                    sees(candidate) && (status === null || candidate.status === status),
                ),
              },
            })
          }
          const [, , preId, sub] = path.split('/')
          const found = preRegistrationsOf(schoolId).find((candidate) => candidate.id === preId)
          if (found === undefined || !sees(found))
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          if (sub === undefined && request.method() === 'GET')
            return route.fulfill({ json: { data: found } })
          if (sub === 'refuse' && request.method() === 'POST') {
            const body = z.object({ reason: z.string() }).parse(request.postDataJSON())
            if (found.status !== 'pending')
              return route.fulfill({
                status: 409,
                json: { message: 'Déjà traitée.', code: 'already_decided' },
              })
            Object.assign(found, {
              status: 'refused',
              decided_by_name: current?.name ?? '',
              decided_at: '2026-11-07T10:00:00+00:00',
              decision_note: body.reason,
              notification_status: 'failed',
              notification_failure: 'Aucun fournisseur SMS n’est configuré.',
            })
            return route.fulfill({ json: { data: found } })
          }
        }
        // Factures d'un élève : route de la facturation, plus bas
        if (path.startsWith('/students/') && !path.endsWith('/invoices')) {
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
        if (request.method() === 'PUT' && path.startsWith('/billing/calendars/')) {
          const schoolId = schoolHeader ?? ''
          const cycleId = path.slice('/billing/calendars/'.length)
          if (!holds(schoolId, 'billing.manage', cycleId)) return route.fulfill(forbidden)
          const body = z
            .object({ dates: z.array(z.object({ due_on: z.string(), label: z.string() })) })
            .parse(request.postDataJSON())
          if (body.dates.length !== calendarOf(schoolId, cycleId).length)
            return route.fulfill({
              status: 422,
              json: {
                message: 'Nombre de dates.',
                errors: { dates: ['Nombre de dates incorrect.'] },
              },
            })
          calendars.set(
            `${schoolId}:${cycleId}`,
            body.dates.map((date) => ({ ...date, amount: 0 })),
          )
          return route.fulfill({ json: { data: gridResource(schoolId) } })
        }
        if (request.method() === 'GET' && /^\/students\/[^/]+\/invoices$/.test(path)) {
          const schoolId = schoolHeader ?? ''
          const student = studentsOf(schoolId).find(
            (candidate) => path === `/students/${candidate.id}/invoices`,
          )
          if (student === undefined || !canSee(schoolId, student, 'billing.view'))
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          return route.fulfill({
            json: {
              data: invoicesOf(schoolId)
                .filter((invoice) => invoice.student_id === student.id)
                .map((invoice) => invoiceResource(schoolId, invoice)),
            },
          })
        }
        if (path.startsWith('/payments/')) {
          const schoolId = schoolHeader ?? ''
          const [, , paymentId, sub] = path.split('/')
          const payment = paymentsOf(schoolId).find((candidate) => candidate.id === paymentId)
          const student =
            payment === undefined ? undefined : studentOfInvoice(schoolId, payment.invoice_id)
          if (
            payment === undefined ||
            student === undefined ||
            !canSee(schoolId, student, 'billing.view')
          )
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          if (sub === 'receipt-pdf') {
            // Rendu en arrière-plan : « en préparation » à la première lecture de chaque version, puis prêt
            const cancelled = payment.cancellation !== null
            const version = `${payment.id}:${String(cancelled)}`
            const reads = receiptPdfReads.get(version) ?? 0
            receiptPdfReads.set(version, reads + 1)
            const ready = reads > 0 || request.method() === 'POST'
            return route.fulfill({
              json: {
                data: {
                  status: ready ? 'ready' : 'pending',
                  cancelled,
                  url: ready
                    ? `http://localhost:8000/api/v1/files/receipts/${cancelled ? 'b' : 'a'}${payment.id.slice(1)}.pdf?expires=1&signature=mock`
                    : null,
                },
              },
            })
          }
          if (sub === 'cancel' && request.method() === 'POST') {
            const cycleId = levelOfStudent(schoolId, student)?.cycle.id ?? null
            if (!holds(schoolId, 'billing.cancel', cycleId)) return route.fulfill(forbidden)
            if (payment.cancellation !== null)
              return route.fulfill({
                status: 409,
                json: { message: 'Déjà annulé.', code: 'already_cancelled' },
              })
            const body = z.object({ reason: z.string() }).parse(request.postDataJSON())
            payment.cancellation = {
              reason: body.reason,
              cancelled_at: '2026-11-04T10:15:00+00:00',
              cancelled_by_name: current?.name ?? '',
            }
          }
          return route.fulfill({ json: { data: receiptResource(schoolId, payment) } })
        }
        if (request.method() === 'GET' && path === '/billing/cash-desk') {
          const schoolId = schoolHeader ?? ''
          if (
            !holds(schoolId, 'billing.manage', null) &&
            !cyclesOf(schoolId).some((cycle) => holds(schoolId, 'billing.manage', cycle.id))
          )
            return route.fulfill(forbidden)
          const date = new URL(request.url()).searchParams.get('date') ?? '2026-11-04'
          return route.fulfill({ json: { data: cashDeskResource(schoolId, date) } })
        }
        if (request.method() === 'POST' && /^\/billing\/cash-sessions\/[^/]+\/close$/.test(path)) {
          const schoolId = schoolHeader ?? ''
          const sessionId = path.split('/')[3] ?? ''
          const session = cashDeskResource(schoolId, sessionId.slice(-10)).sessions.find(
            (candidate) => candidate.id === sessionId,
          )
          if (session === undefined)
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          if (!session.is_mine) return route.fulfill(forbidden)
          if (session.closed_at !== null)
            return route.fulfill({
              status: 409,
              json: { message: 'Clôturée.', code: 'cash_closed' },
            })
          const body = z
            .object({ counted_cash: z.number(), note: z.optional(z.nullable(z.string())) })
            .parse(request.postDataJSON())
          if (body.counted_cash !== session.expected_cash && (body.note ?? '') === '')
            return route.fulfill({
              status: 422,
              json: { message: 'Écart.', errors: { note: ['Expliquez l’écart.'] } },
            })
          closedSessions.set(sessionId, {
            closed_at: '2026-11-04T18:00:00+00:00',
            counted: body.counted_cash,
            note: body.note ?? null,
          })
          const closed = cashDeskResource(schoolId, sessionId.slice(-10)).sessions.find(
            (candidate) => candidate.id === sessionId,
          )
          return route.fulfill({ json: { data: closed } })
        }
        if (request.method() === 'GET' && path === '/grading/classrooms') {
          return route.fulfill({
            json: {
              data: gradingClassrooms(schoolHeader ?? '').map((classroom) => ({
                id: classroom.id,
                name: classroom.name,
                level_id: classroom.level_id,
                cycle: classroom.cycle,
                mode: classroom.mode,
                grade_scale: classroom.grade_scale,
                can_manage: classroom.can_manage,
                is_homeroom: classroom.is_homeroom,
              })),
            },
          })
        }
        if (request.method() === 'GET' && path === '/grading/settings') {
          const schoolId = schoolHeader ?? ''
          const cycleId = new URL(request.url()).searchParams.get('cycle_id') ?? ''
          if (!holds(schoolId, 'school.settings.view', cycleId)) return route.fulfill(forbidden)
          const settings = gradingSettingsResource(schoolId, cycleId)
          if (settings === undefined)
            return route.fulfill({
              status: 422,
              json: { message: 'Cycle inconnu.', errors: { cycle_id: ['Cycle inconnu.'] } },
            })
          return route.fulfill({ json: { data: settings } })
        }
        {
          const match = /^\/grading\/(cycles|levels)\/([^/]+)\/(terms|subjects|skills)$/.exec(path)
          if (request.method() === 'PUT' && match !== null) {
            const schoolId = schoolHeader ?? ''
            const [, scope = '', id = '', list = ''] = match
            const cycle =
              scope === 'cycles'
                ? cyclesOf(schoolId).find((candidate) => candidate.id === id)
                : levelOf(schoolId, id)?.cycle
            if (cycle === undefined)
              return route.fulfill({ status: 404, json: { message: 'Not Found' } })
            if (!holds(schoolId, 'school.settings.manage', cycle.id))
              return route.fulfill(forbidden)
            const body = z.record(z.string(), z.unknown()).parse(request.postDataJSON())
            if (list === 'terms') {
              const terms = z
                .array(z.object({ label: z.string(), starts_on: z.string(), ends_on: z.string() }))
                .parse(body.terms)
              gradingTerms.set(
                cycle.id,
                termsOf(cycle.id, cycle.settings.term_type).map((term, index) => ({
                  ...term,
                  ...(terms[index] ?? {}),
                })),
              )
            } else if (list === 'subjects') {
              const subjects = z
                .array(
                  z.object({
                    id: z.nullable(z.string()).optional(),
                    name: z.string(),
                    coefficient: z.number(),
                  }),
                )
                .parse(body.subjects)
              gradingSubjects.set(
                id,
                subjects.map((subject, index) => ({
                  id: subject.id ?? `${id}-n${String(Date.now())}-${String(index)}`,
                  name: subject.name,
                  coefficient: subject.coefficient,
                  position: index + 1,
                })),
              )
            } else {
              const skills = z
                .array(
                  z.object({
                    id: z.nullable(z.string()).optional(),
                    domain: z.string(),
                    label: z.string(),
                  }),
                )
                .parse(body.skills)
              gradingSkills.set(
                cycle.id,
                skills.map((skill, index) => ({
                  id: skill.id ?? `${cycle.id}-n${String(Date.now())}-${String(index)}`,
                  domain: skill.domain,
                  label: skill.label,
                  position: index + 1,
                })),
              )
            }
            return route.fulfill({ json: { data: gradingSettingsResource(schoolId, cycle.id) } })
          }
        }
        {
          const match =
            /^\/classrooms\/([^/]+)\/(report-cards|appreciations|report-cards\/close|report-cards\/reopen|report-cards\/retry)$/.exec(
              path,
            )
          if (match !== null) {
            const schoolId = schoolHeader ?? ''
            const [, classroomId = '', action = ''] = match
            const classroom = gradingClassrooms(schoolId).find(
              (candidate) => candidate.id === classroomId,
            )
            if (classroom === undefined)
              return route.fulfill({ status: 404, json: { message: 'Not Found' } })
            if (request.method() === 'GET')
              return route.fulfill({
                json: {
                  data: reportCardsResource(
                    schoolId,
                    classroomId,
                    new URL(request.url()).searchParams.get('term_id'),
                  ),
                },
              })
            const body = z.record(z.string(), z.unknown()).parse(request.postDataJSON())
            const termId = typeof body.term_id === 'string' ? body.term_id : ''
            const canValidate = staffHolds(schoolId, 'grades.validate', classroom.cycle.id)
            const key = `${classroomId}:${termId}`
            if (action === 'appreciations') {
              if (isClosed(classroomId, termId))
                return route.fulfill({
                  status: 409,
                  json: { message: 'Période validée.', code: 'term_closed' },
                })
              const studentId = typeof body.student_id === 'string' ? body.student_id : ''
              const saved = appreciations.get(`${termId}:${studentId}`) ?? {
                teacher_comment: null,
                director_comment: null,
                mention: null,
              }
              if ('teacher_comment' in body)
                saved.teacher_comment =
                  typeof body.teacher_comment === 'string' && body.teacher_comment !== ''
                    ? body.teacher_comment
                    : null
              if ('director_comment' in body) {
                if (!canValidate) return route.fulfill(forbidden)
                saved.director_comment =
                  typeof body.director_comment === 'string' && body.director_comment !== ''
                    ? body.director_comment
                    : null
              }
              if ('mention' in body)
                saved.mention = typeof body.mention === 'string' ? body.mention : null
              appreciations.set(`${termId}:${studentId}`, saved)
              for (const row of Array.isArray(body.subjects) ? body.subjects : []) {
                const parsed = z
                  .object({ subject_id: z.string(), comment: z.nullable(z.string()) })
                  .parse(row)
                const commentKey = `${termId}:${studentId}:${parsed.subject_id}`
                if (parsed.comment === null || parsed.comment === '')
                  subjectComments.delete(commentKey)
                else subjectComments.set(commentKey, parsed.comment)
              }
            } else {
              if (!canValidate) return route.fulfill(forbidden)
              const history = closures.get(key) ?? []
              if (action === 'report-cards/close') {
                if (isClosed(classroomId, termId))
                  return route.fulfill({
                    status: 409,
                    json: { message: 'Déjà validés.', code: 'already_closed' },
                  })
                history.push({
                  id: `closure-${String(history.length + 1)}`,
                  closed_at: `${TODAY}T10:00:00+00:00`,
                  closed_by: current?.name ?? '',
                  reopened_at: null,
                  reopened_by: null,
                  reopen_reason: null,
                })
              } else if (action === 'report-cards/reopen') {
                const open = openClosure(classroomId, termId)
                if (open === undefined)
                  return route.fulfill({
                    status: 409,
                    json: { message: 'Non validés.', code: 'not_closed' },
                  })
                open.reopened_at = `${TODAY}T11:00:00+00:00`
                open.reopened_by = current?.name ?? ''
                open.reopen_reason = typeof body.reason === 'string' ? body.reason : ''
              }
              closures.set(key, history)
            }
            return route.fulfill({
              json: { data: reportCardsResource(schoolId, classroomId, termId) },
            })
          }
        }
        {
          const match = /^\/grading\/cycles\/([^/]+)\/mentions$/.exec(path)
          if (request.method() === 'PUT' && match !== null) {
            const schoolId = schoolHeader ?? ''
            const cycleId = match[1] ?? ''
            if (!holds(schoolId, 'school.settings.manage', cycleId)) return route.fulfill(forbidden)
            mentionThresholds.set(
              cycleId,
              z.record(z.string(), z.number()).parse(request.postDataJSON()),
            )
            return route.fulfill({ json: { data: gradingSettingsResource(schoolId, cycleId) } })
          }
        }
        {
          const match = /^\/classrooms\/([^/]+)\/(grade-grid|results|skills|assessments)$/.exec(
            path,
          )
          if (match !== null) {
            const schoolId = schoolHeader ?? ''
            const [, classroomId = '', resource = ''] = match
            const classroom = gradingClassrooms(schoolId).find(
              (candidate) => candidate.id === classroomId,
            )
            if (classroom === undefined)
              return route.fulfill({ status: 404, json: { message: 'Not Found' } })
            const query = new URL(request.url()).searchParams
            const termId = query.get('term_id')
            if (request.method() === 'GET' && resource === 'grade-grid') {
              if (classroom.mode !== 'weighted_average')
                return route.fulfill({
                  status: 409,
                  json: { message: 'Mode.', code: 'wrong_mode' },
                })
              return route.fulfill({
                json: {
                  data: gradeGridResource(schoolId, classroomId, termId, query.get('subject_id')),
                },
              })
            }
            if (request.method() === 'GET' && resource === 'results')
              return route.fulfill({
                json: { data: classResultsResource(schoolId, classroomId, termId) },
              })
            if (request.method() === 'GET' && resource === 'skills')
              return route.fulfill({
                json: { data: skillGridResource(schoolId, classroomId, termId) },
              })
            if (!classroom.can_manage) return route.fulfill(forbidden)
            if (request.method() === 'PUT' && resource === 'skills') {
              const body = z
                .object({ term_id: z.string(), evaluations: z.array(z.unknown()) })
                .parse(request.postDataJSON())
              saveSkillLevels(body.term_id, body.evaluations)
              return route.fulfill({
                json: { data: skillGridResource(schoolId, classroomId, body.term_id) },
              })
            }
            if (request.method() === 'POST' && resource === 'assessments') {
              const body = z
                .object({
                  id: z.nullable(z.string()).optional(),
                  subject_id: z.string(),
                  term_id: z.string(),
                  title: z.string(),
                  date: z.string(),
                  out_of: z.number(),
                })
                .parse(request.postDataJSON())
              const assessment = {
                ...body,
                id: body.id ?? `a-${String(Date.now())}`,
                classroom_id: classroomId,
              }
              assessments.set(assessment.id, assessment)
              return route.fulfill({ status: 201, json: { data: assessment } })
            }
          }
        }
        {
          const match = /^\/assessments\/([^/]+)(\/grades)?$/.exec(path)
          if (match !== null) {
            const schoolId = schoolHeader ?? ''
            const assessment = assessments.get(match[1] ?? '')
            const classroom = gradingClassrooms(schoolId).find(
              (candidate) => candidate.id === assessment?.classroom_id,
            )
            if (assessment === undefined || classroom === undefined)
              return route.fulfill({ status: 404, json: { message: 'Not Found' } })
            if (!classroom.can_manage) return route.fulfill(forbidden)
            if (request.method() !== 'GET' && isClosed(classroom.id, assessment.term_id))
              return route.fulfill({
                status: 409,
                json: { message: 'Période validée.', code: 'term_closed' },
              })
            if (request.method() === 'PUT' && match[2] === '/grades') {
              const body = z.object({ grades: z.array(z.unknown()) }).parse(request.postDataJSON())
              saveGrades(assessment.id, body.grades)
              return route.fulfill({
                json: {
                  data: gradeGridResource(
                    schoolId,
                    classroom.id,
                    assessment.term_id,
                    assessment.subject_id,
                  ),
                },
              })
            }
            if (request.method() === 'DELETE') {
              assessments.delete(assessment.id)
              return route.fulfill({ status: 204, body: '' })
            }
            if (request.method() === 'PATCH') {
              const body = z
                .object({ title: z.string(), date: z.string(), out_of: z.number() })
                .parse(request.postDataJSON())
              const next = { ...assessment, ...body }
              assessments.set(assessment.id, next)
              return route.fulfill({ json: { data: next } })
            }
          }
        }
        if (request.method() === 'GET' && path === '/attendance/classrooms') {
          return route.fulfill({ json: { data: attendanceClassrooms(schoolHeader ?? '') } })
        }
        {
          const match =
            /^\/classrooms\/([^/]+)\/(roll-calls\/(\d{4}-\d{2}-\d{2})|attendance)$/.exec(path)
          if (match !== null) {
            const schoolId = schoolHeader ?? ''
            const classroomId = match[1] ?? ''
            const classroom = attendanceClassrooms(schoolId).find(
              (candidate) => candidate.id === classroomId,
            )
            if (classroom === undefined)
              return route.fulfill({ status: 404, json: { message: 'Not Found' } })
            if (match[2] === 'attendance') {
              const url = new URL(request.url())
              const days = []
              for (
                let day = new Date(`${url.searchParams.get('from') ?? TODAY}T00:00:00Z`);
                day.toISOString().slice(0, 10) <= (url.searchParams.get('to') ?? TODAY) &&
                day.toISOString().slice(0, 10) <= TODAY;
                day.setUTCDate(day.getUTCDate() + 1)
              ) {
                if (day.getUTCDay() === 0 || day.getUTCDay() === 6) continue
                const date = day.toISOString().slice(0, 10)
                const call = rollCalls.get(`${classroomId}:${date}`)
                const marks = [...(call?.marks.values() ?? [])]
                const absent = marks.filter((mark) => mark.status === 'absent').length
                days.push({
                  date,
                  taken: call !== undefined,
                  present: call === undefined ? 0 : rosterOf(schoolId, classroomId).length - absent,
                  absent,
                  late: marks.filter((mark) => mark.status === 'late').length,
                })
              }
              return route.fulfill({ json: { data: days } })
            }
            const date = match[3] ?? TODAY
            if (request.method() === 'PUT') {
              if (classroom.mode !== 'roll_call')
                return route.fulfill({
                  status: 409,
                  json: { message: 'Mode.', code: 'wrong_mode' },
                })
              if (!classroom.can_take) return route.fulfill(forbidden)
              const body = z
                .object({
                  marks: z.array(z.object({ student_id: z.string(), status: z.string() })),
                })
                .parse(request.postDataJSON())
              saveCall(classroomId, date, body.marks)
            }
            return route.fulfill({ json: { data: rollCallResource(schoolId, classroomId, date) } })
          }
        }
        if (request.method() === 'GET' && path === '/attendance/absences') {
          const url = new URL(request.url())
          const pending =
            url.searchParams.get('pending') === 'true' || url.searchParams.get('pending') === '1'
          return route.fulfill({
            json: {
              data: absenceRows(
                schoolHeader ?? '',
                pending ? null : (url.searchParams.get('date') ?? TODAY),
                pending,
              ),
            },
          })
        }
        {
          const match =
            /^\/attendance\/(marks|justifications)\/([^/]+)\/(justification|decision)$/.exec(path)
          if (match !== null && request.method() === 'POST') {
            const schoolId = schoolHeader ?? ''
            const found = findMark(match[2] ?? '')
            if (found === undefined)
              return route.fulfill({ status: 404, json: { message: 'Not Found' } })
            if (match[3] === 'decision') {
              const body = z.object({ decision: z.string() }).parse(request.postDataJSON())
              if (found.mark.justification?.status !== 'pending')
                return route.fulfill({
                  status: 409,
                  json: { message: 'Déjà traitée.', code: 'already_decided' },
                })
              found.mark.justification.status =
                body.decision === 'accepted' ? 'accepted' : 'refused'
            } else {
              const reason =
                /name="reason"\r\n\r\n([^\r]*)/.exec(request.postData() ?? '')?.[1] ?? ''
              const byGuardian = isGuardianHere(schoolId)
              found.mark.justification = {
                id: nextBillingId(),
                status: byGuardian ? 'pending' : 'accepted',
                source: byGuardian ? 'guardian' : 'school',
                reason,
                by: current?.name ?? '',
                at: `${TODAY}T09:00:00+00:00`,
              }
            }
            const row = absenceRows(schoolId, null, false).find(
              (candidate) => candidate.id === found.mark.id,
            )
            return route.fulfill({ json: { data: row } })
          }
        }
        if (path === '/announcements' || path.startsWith('/announcements/')) {
          const schoolId = schoolHeader ?? ''
          if (request.method() === 'GET' && path === '/announcements')
            return route.fulfill({
              json: {
                data: announcementsOf(schoolId)
                  .filter((announcement) => announcementVisible(schoolId, announcement))
                  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
                  .map((announcement) => announcementResource(schoolId, announcement)),
              },
            })
          if (request.method() === 'GET' && path === '/announcements/targets')
            return route.fulfill({
              json: {
                data: {
                  school: canPublish(schoolId, 'school', null, null),
                  cycles: cyclesOf(schoolId)
                    .filter((cycle) => canPublish(schoolId, 'cycle', cycle.id, null))
                    .map((cycle) => ({ id: cycle.id, code: cycle.code, name: cycle.name })),
                  classrooms: classroomsOf(schoolId)
                    .filter((classroom) => canPublish(schoolId, 'classroom', null, classroom.id))
                    .map((classroom) => ({
                      id: classroom.id,
                      name: classroomResource(schoolId, classroom).name,
                      cycle_id: cycleOfClassroom(schoolId, classroom.id) ?? '',
                    })),
                },
              },
            })
          if (request.method() === 'POST' && path === '/announcements') {
            const body = z
              .object({
                title: z.string(),
                body: z.string(),
                audience: z.enum(['school', 'cycle', 'classroom']),
                cycle_id: z.optional(z.nullable(z.string())),
                classroom_id: z.optional(z.nullable(z.string())),
              })
              .parse(request.postDataJSON())
            const classroomId = body.audience === 'classroom' ? (body.classroom_id ?? null) : null
            const cycleId =
              body.audience === 'classroom'
                ? cycleOfClassroom(schoolId, classroomId ?? '')
                : body.audience === 'cycle'
                  ? (body.cycle_id ?? null)
                  : null
            if (!canPublish(schoolId, body.audience, cycleId, classroomId))
              return route.fulfill(forbidden)
            const reach = studentsOf(schoolId).filter((student) => {
              const enrolled = latestEnrollment(student)?.classroom_id ?? ''
              return (
                body.audience === 'school' ||
                (body.audience === 'cycle'
                  ? cycleOfClassroom(schoolId, enrolled) === cycleId
                  : enrolled === classroomId)
              )
            }).length
            const announcement: MockAnnouncement = {
              id: nextBillingId(),
              title: body.title,
              body: body.body,
              audience: body.audience,
              cycleId,
              classroomId,
              reach,
              authorName: current?.name ?? '',
              publishedAt: sentNow(),
            }
            announcementsOf(schoolId).push(announcement)
            return route.fulfill({ json: { data: announcementResource(schoolId, announcement) } })
          }
          if (request.method() === 'DELETE') {
            const list = announcementsOf(schoolId)
            const index = list.findIndex((candidate) => path === `/announcements/${candidate.id}`)
            const announcement = list[index]
            if (announcement === undefined || !announcementVisible(schoolId, announcement))
              return route.fulfill({ status: 404, json: { message: 'Not Found' } })
            if (
              !canPublish(
                schoolId,
                announcement.audience,
                announcement.cycleId,
                announcement.classroomId,
              )
            )
              return route.fulfill(forbidden)
            list.splice(index, 1)
            return route.fulfill({ status: 204, body: '' })
          }
        }
        if (path === '/calendar/events' || path.startsWith('/calendar/events/')) {
          const schoolId = schoolHeader ?? ''
          const list = eventsOf(schoolId)
          if (request.method() === 'GET' && path === '/calendar/events') {
            const url = new URL(request.url())
            const from = url.searchParams.get('from') ?? '0000-01-01'
            const to = url.searchParams.get('to') ?? '9999-12-31'
            return route.fulfill({
              json: {
                data: list
                  .filter(
                    (event) =>
                      eventVisible(schoolId, event) &&
                      event.ends_on >= from &&
                      event.starts_on <= to,
                  )
                  .sort((a, b) => a.starts_on.localeCompare(b.starts_on))
                  .map((event) => eventResource(schoolId, event)),
              },
            })
          }
          const existing = list.find((candidate) => path === `/calendar/events/${candidate.id}`)
          if (path !== '/calendar/events') {
            if (existing === undefined || !eventVisible(schoolId, existing))
              return route.fulfill({ status: 404, json: { message: 'Not Found' } })
            if (!canManageEvent(schoolId, existing.cycleId)) return route.fulfill(forbidden)
            if (request.method() === 'DELETE') {
              list.splice(list.indexOf(existing), 1)
              return route.fulfill({ status: 204, body: '' })
            }
          }
          const body = z
            .object({
              title: z.string(),
              kind: z.enum(['holiday', 'exam', 'meeting', 'event', 'training']),
              starts_on: z.string(),
              ends_on: z.string(),
              cycle_id: z.optional(z.nullable(z.string())),
              location: z.optional(z.nullable(z.string())),
            })
            .parse(request.postDataJSON())
          if (body.ends_on < body.starts_on)
            return route.fulfill({
              status: 422,
              json: { message: 'Dates.', errors: { ends_on: ['La fin doit suivre le début.'] } },
            })
          if (!canManageEvent(schoolId, body.cycle_id ?? null)) return route.fulfill(forbidden)
          const event: MockEvent = existing ?? {
            id: nextBillingId(),
            title: '',
            kind: 'event',
            starts_on: '',
            ends_on: '',
            cycleId: null,
            location: null,
          }
          Object.assign(event, {
            title: body.title,
            kind: body.kind,
            starts_on: body.starts_on,
            ends_on: body.ends_on,
            cycleId: body.cycle_id ?? null,
            location: body.location ?? null,
          })
          if (existing === undefined) list.push(event)
          return route.fulfill({ json: { data: eventResource(schoolId, event) } })
        }
        if (path === '/conversations' || path.startsWith('/conversations/')) {
          const schoolId = schoolHeader ?? ''
          if (request.method() === 'GET' && path === '/conversations')
            return route.fulfill({ json: { data: visibleConversations(schoolId) } })
          if (request.method() === 'GET' && path === '/conversations/unread-count')
            return route.fulfill({
              json: {
                data: {
                  count: visibleConversations(schoolId).filter((row) => row.unread > 0).length,
                },
              },
            })
          if (request.method() === 'POST' && path === '/conversations') {
            const body = z
              .object({
                student_id: z.string(),
                channel: z.enum(['teacher', 'office']),
                subject: z.string(),
                body: z.string(),
                guardian_id: z.optional(z.nullable(z.string())),
              })
              .parse(request.postDataJSON())
            if (body.body.trim() === '')
              return route.fulfill({
                status: 422,
                json: { message: 'Message vide.', errors: { body: ['Écrivez votre message.'] } },
              })
            const student = studentsOf(schoolId).find(
              (candidate) => candidate.id === body.student_id,
            )
            if (student === undefined)
              return route.fulfill({ status: 404, json: { message: 'Not Found' } })
            const started = startConversation(
              schoolId,
              student,
              body.channel,
              body.subject,
              body.guardian_id ?? null,
            )
            if (started === 404)
              return route.fulfill({ status: 404, json: { message: 'Not Found' } })
            if (started === 403) return route.fulfill(forbidden)
            if (typeof started === 'number')
              return route.fulfill({
                status: 409,
                json: {
                  message:
                    'Cette classe n’a pas encore d’enseignant(e) titulaire : écrivez à l’administration.',
                  code: 'no_teacher',
                },
              })
            postMessage(schoolId, started, body.body.trim())
            return route.fulfill({ json: { data: conversationDetail(schoolId, started) } })
          }
          const [, , conversationId, sub] = path.split('/')
          const conversation = conversationsOf(schoolId).find(
            (candidate) => candidate.id === conversationId,
          )
          if (conversation === undefined || !canReadConversation(schoolId, conversation))
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          if (request.method() === 'POST' && sub === 'messages') {
            if (!canWriteConversation(schoolId, conversation)) return route.fulfill(forbidden)
            const body = z.object({ body: z.string() }).parse(request.postDataJSON())
            postMessage(schoolId, conversation, body.body.trim())
          }
          if (request.method() === 'POST' && sub === 'read')
            reads.set(`${conversation.id}:${current?.phone ?? ''}`, sentNow())
          return route.fulfill({ json: { data: conversationDetail(schoolId, conversation) } })
        }
        if (
          request.method() === 'POST' &&
          /^\/guardian\/children\/[^/]+\/planned-absences$/.test(path)
        ) {
          const schoolId = schoolHeader ?? ''
          const student = guardianChildren(schoolId).find(
            (candidate) => path === `/guardian/children/${candidate.id}/planned-absences`,
          )
          if (student === undefined)
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          const body = z
            .object({
              starts_on: z.string(),
              ends_on: z.string(),
              reason: z.string(),
              message: z.optional(z.nullable(z.string())),
            })
            .parse(request.postDataJSON())
          if (body.starts_on < TODAY)
            return route.fulfill({
              status: 422,
              json: {
                message: 'Jour passé.',
                errors: {
                  starts_on: ['Une absence passée se justifie depuis la liste des absences.'],
                },
              },
            })
          const overlap = plannedOf(schoolId).some(
            (planned) =>
              planned.studentId === student.id &&
              planned.status !== 'refused' &&
              planned.starts_on <= body.ends_on &&
              planned.ends_on >= body.starts_on,
          )
          if (overlap)
            return route.fulfill({
              status: 409,
              json: { message: 'Une absence est déjà annoncée sur ces jours.', code: 'overlap' },
            })
          const planned: MockPlanned = {
            id: nextBillingId(),
            studentId: student.id,
            starts_on: body.starts_on,
            ends_on: body.ends_on,
            reason: body.reason,
            status: 'pending',
            by: current?.name ?? '',
            at: `${TODAY}T09:00:00+00:00`,
          }
          plannedOf(schoolId).push(planned)
          for (const [key, call] of rollCalls) {
            const date = key.slice(-10)
            const mark = call.marks.get(student.id)
            if (mark !== undefined && body.starts_on <= date && date <= body.ends_on)
              justifyFromPlanned(planned, mark)
          }
          const started = startConversation(
            schoolId,
            student,
            'office',
            `Absences de ${student.first_name}`,
            null,
          )
          if (typeof started !== 'number')
            postMessage(
              schoolId,
              started,
              `Absence de ${student.first_name} prévue. Motif : ${body.reason}`,
              planned.id,
            )
          return route.fulfill({
            json: {
              data: {
                id: planned.id,
                starts_on: planned.starts_on,
                ends_on: planned.ends_on,
                reason: planned.reason,
                status: planned.status,
                note: null,
              },
            },
          })
        }
        if (request.method() === 'GET' && path === '/attendance/planned-absences') {
          const schoolId = schoolHeader ?? ''
          if (attendanceClassrooms(schoolId).length === 0) return route.fulfill(forbidden)
          const pending = new URL(request.url()).searchParams.get('pending')
          const onlyPending = pending === 'true' || pending === '1'
          return route.fulfill({
            json: {
              data: plannedOf(schoolId)
                .filter((planned) =>
                  onlyPending ? planned.status === 'pending' : planned.ends_on >= TODAY,
                )
                .flatMap((planned) => {
                  const row = plannedResource(schoolId, planned)
                  return row === undefined ? [] : [row]
                }),
            },
          })
        }
        if (
          request.method() === 'POST' &&
          /^\/attendance\/planned-absences\/[^/]+\/decision$/.test(path)
        ) {
          const schoolId = schoolHeader ?? ''
          const planned = plannedOf(schoolId).find(
            (candidate) => path === `/attendance/planned-absences/${candidate.id}/decision`,
          )
          const row = planned === undefined ? undefined : plannedResource(schoolId, planned)
          if (planned === undefined || row === undefined)
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          if (!row.can_decide) return route.fulfill(forbidden)
          if (planned.status !== 'pending')
            return route.fulfill({
              status: 409,
              json: {
                message: 'Cette absence annoncée a déjà été traitée.',
                code: 'already_decided',
              },
            })
          const body = z.object({ decision: z.string() }).parse(request.postDataJSON())
          planned.status = body.decision === 'accepted' ? 'accepted' : 'refused'
          for (const call of rollCalls.values())
            for (const mark of call.marks.values())
              if (
                mark.justification?.plannedId === planned.id &&
                mark.justification.status === 'pending'
              )
                mark.justification.status = planned.status
          return route.fulfill({ json: { data: plannedResource(schoolId, planned) } })
        }
        if (request.method() === 'POST' && /^\/guardian\/children\/[^/]+\/payments$/.test(path)) {
          const schoolId = schoolHeader ?? ''
          const student = guardianChildren(schoolId).find(
            (candidate) => path === `/guardian/children/${candidate.id}/payments`,
          )
          const invoice =
            student === undefined
              ? undefined
              : invoicesOf(schoolId).find((candidate) => candidate.student_id === student.id)
          if (student === undefined || invoice === undefined)
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          const body = z
            .object({ amount: z.number(), method: z.string(), phone: z.string() })
            .parse(request.postDataJSON())
          const remaining = invoiceResource(schoolId, invoice).balance.remaining
          if (body.amount > remaining)
            return route.fulfill({
              status: 409,
              json: {
                message: 'Le montant dépasse le reste à payer de la facture.',
                code: 'amount_exceeds',
              },
            })
          const fees = feesOf(schoolId)
          const fee = Math.ceil((body.amount * fees.fee_rate_bps) / 10000)
          const intent: MockIntent = {
            id: nextBillingId(),
            studentId: student.id,
            invoiceId: invoice.id,
            method: body.method,
            phone: body.phone,
            amount: body.amount,
            fee,
            charged: fees.fee_payer === 'guardian' ? body.amount + fee : body.amount,
            feePayer: fees.fee_payer,
            status: 'pending',
            reads: 0,
            paymentId: null,
            failureReason: null,
          }
          intents.set(intent.id, intent)
          return route.fulfill({ status: 201, json: { data: intentResource(schoolId, intent) } })
        }
        if (request.method() === 'GET' && path.startsWith('/guardian/payment-intents/')) {
          const schoolId = schoolHeader ?? ''
          const intent = intents.get(path.split('/')[3] ?? '')
          if (
            intent === undefined ||
            !guardianChildren(schoolId).some((child) => child.id === intent.studentId)
          )
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          intent.reads += 1
          if (intent.status === 'pending' && intent.reads >= 2) {
            if (intent.phone.endsWith('99')) {
              intent.status = 'failed'
              intent.failureReason = 'Solde insuffisant.'
            } else {
              const invoice = invoicesOf(schoolId).find(
                (candidate) => candidate.id === intent.invoiceId,
              )
              const list = paymentsOf(schoolId)
              const payment: MockPayment = {
                id: nextBillingId(),
                invoice_id: intent.invoiceId,
                receipt_number: `REC-2026-${String(list.length + 1).padStart(6, '0')}`,
                amount: intent.amount,
                method: intent.method,
                reference: `OM${String(list.length + 1).padStart(8, '0')}`,
                payer_name:
                  invoice === undefined
                    ? ''
                    : (invoiceResource(schoolId, invoice).payer?.name ?? ''),
                cashier_name: 'Mobile Money',
                cashier_phone: current?.phone ?? '',
                paid_at: PAID_AT,
                cancellation: null,
              }
              list.push(payment)
              intent.status = 'succeeded'
              intent.paymentId = payment.id
            }
          }
          return route.fulfill({ json: { data: intentResource(schoolId, intent) } })
        }
        if (request.method() === 'GET' && path === '/guardian/children') {
          const schoolId = schoolHeader ?? ''
          if (!isGuardianHere(schoolId)) return route.fulfill(forbidden)
          return route.fulfill({
            json: {
              data: guardianChildren(schoolId).map((student) => childSummary(schoolId, student)),
            },
          })
        }
        if (request.method() === 'GET' && path.startsWith('/guardian/children/')) {
          const schoolId = schoolHeader ?? ''
          const student = guardianChildren(schoolId).find(
            (candidate) => path === `/guardian/children/${candidate.id}`,
          )
          if (student === undefined)
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          const termId = new URL(request.url()).searchParams.get('term_id')
          return route.fulfill({ json: { data: childResource(schoolId, student, termId) } })
        }
        if (request.method() === 'GET' && path === '/daycare/board') {
          return route.fulfill({ json: { data: daycareBoard(schoolHeader ?? '') } })
        }
        if (
          request.method() === 'POST' &&
          (path === '/daycare/visits' || path === '/daycare/logs')
        ) {
          const schoolId = schoolHeader ?? ''
          const body = z
            .object({
              student_id: z.string(),
              time: z.string(),
              direction: z.optional(z.string()),
              person: z.optional(z.nullable(z.string())),
              kind: z.optional(z.string()),
              note: z.optional(z.string()),
            })
            .parse(request.postDataJSON())
          recordDaycare(
            body.student_id,
            path === '/daycare/visits'
              ? {
                  kind: 'check',
                  direction: body.direction ?? 'in',
                  time: body.time,
                  person: body.person ?? null,
                }
              : {
                  kind: 'log',
                  time: body.time,
                  logKind: body.kind ?? 'activity',
                  note: body.note ?? '',
                },
          )
          return route.fulfill({ json: { data: daycareBoard(schoolId) } })
        }
        if (request.method() === 'POST' && path === '/sync') {
          const body = z
            .object({
              operations: z.array(
                z.object({
                  id: z.string(),
                  type: z.string(),
                  payload: z.record(z.string(), z.unknown()),
                }),
              ),
            })
            .parse(request.postDataJSON())
          const data = body.operations.map((operation) => {
            const replayed = syncDone.has(operation.id)
            if (!replayed) {
              syncDone.add(operation.id)
              const payload = operation.payload
              const text = (key: string) => (typeof payload[key] === 'string' ? payload[key] : '')
              if (operation.type === 'attendance.roll_call') {
                const marks = Array.isArray(payload.marks)
                  ? payload.marks.flatMap((mark: unknown) =>
                      typeof mark === 'object' &&
                      mark !== null &&
                      'student_id' in mark &&
                      'status' in mark
                        ? [{ student_id: String(mark.student_id), status: String(mark.status) }]
                        : [],
                    )
                  : []
                saveCall(text('classroom_id'), text('date'), marks)
              } else if (operation.type === 'grades.assessment') {
                const id = text('assessment_id')
                assessments.set(id, {
                  id,
                  classroom_id: text('classroom_id'),
                  subject_id: text('subject_id'),
                  term_id: text('term_id'),
                  title: text('title'),
                  date: text('date'),
                  out_of: typeof payload.out_of === 'number' ? payload.out_of : 20,
                })
              } else if (operation.type === 'grades.save') {
                saveGrades(text('assessment_id'), payload.grades)
              } else if (operation.type === 'skills.save') {
                saveSkillLevels(text('term_id'), payload.evaluations)
              } else if (operation.type === 'daycare.check') {
                recordDaycare(text('student_id'), {
                  kind: 'check',
                  direction: text('direction'),
                  time: text('time'),
                  person: text('person') === '' ? null : text('person'),
                })
              } else {
                recordDaycare(text('student_id'), {
                  kind: 'log',
                  time: text('time'),
                  logKind: text('kind'),
                  note: text('note'),
                })
              }
            }
            return { id: operation.id, status: 'applied', code: null, message: null, replayed }
          })
          return route.fulfill({ json: { data } })
        }
        if (request.method() === 'GET' && path === '/billing/unpaid') {
          const schoolId = schoolHeader ?? ''
          const cycles = cyclesOf(schoolId).filter((cycle) =>
            holds(schoolId, 'billing.view', cycle.id),
          )
          if (
            cycles.length === 0 ||
            (current?.roles.every((role) => role.role === 'guardian' || role.role === 'teacher') ??
              true)
          )
            return route.fulfill(forbidden)
          return route.fulfill({ json: { data: unpaidRows(schoolId) } })
        }
        if (request.method() === 'POST' && path === '/billing/reminders') {
          const schoolId = schoolHeader ?? ''
          const body = z.object({ invoice_ids: z.array(z.string()) }).parse(request.postDataJSON())
          const rows = unpaidRows(schoolId).filter((row) =>
            body.invoice_ids.includes(row.invoice_id),
          )
          if (rows.some((row) => !row.can_remind)) return route.fulfill(forbidden)
          let queued = 0
          let recent = 0
          for (const payer of new Set(rows.map((row) => row.payer?.name ?? ''))) {
            if (reminders.has(`${schoolId}:${payer}`)) {
              recent += 1
              continue
            }
            reminders.set(`${schoolId}:${payer}`, {
              at: '2026-11-04T10:00:00+00:00',
              status: 'sent',
            })
            queued += 1
          }
          return route.fulfill({ json: { data: { queued, recent, no_phone: 0, not_overdue: 0 } } })
        }
        if (request.method() === 'GET' && path === '/billing/dashboard') {
          const schoolId = schoolHeader ?? ''
          const staff =
            current?.roles.some((role) => role.role !== 'guardian' && role.role !== 'teacher') ??
            false
          if (!staff) return route.fulfill(forbidden)
          const students = studentsOf(schoolId)
          const byCycle = cyclesOf(schoolId).map((cycle) => ({
            cycle_id: cycle.id,
            code: cycle.code,
            name: cycle.name,
            students: students.filter(
              (student) => levelOfStudent(schoolId, student)?.cycle.id === cycle.id,
            ).length,
            classrooms: classroomsOf(schoolId).filter(
              (classroom) => levelOf(schoolId, classroom.level_id)?.cycle.id === cycle.id,
            ).length,
          }))
          const live = paymentsOf(schoolId).filter((payment) => payment.cancellation === null)
          const invoicesNow = invoicesOf(schoolId).map((invoice) =>
            invoiceResource(schoolId, invoice),
          )
          const due = invoicesNow.reduce(
            (sum, invoice) =>
              sum +
              invoice.schedule
                .filter((item) => item.due_on <= '2026-11-04')
                .reduce((total, item) => total + item.amount, 0),
            0,
          )
          const overdue = invoicesNow.reduce((sum, invoice) => sum + invoice.balance.overdue, 0)
          const finance = cyclesOf(schoolId).some((cycle) =>
            holds(schoolId, 'billing.view', cycle.id),
          )
            ? {
                collected_month: live
                  .filter((payment) => payment.paid_at.startsWith('2026-11'))
                  .reduce((sum, payment) => sum + payment.amount, 0),
                payments_month: live.filter((payment) => payment.paid_at.startsWith('2026-11'))
                  .length,
                expected_month: invoicesNow.reduce(
                  (sum, invoice) =>
                    sum +
                    invoice.schedule
                      .filter((item) => item.due_on.startsWith('2026-11'))
                      .reduce((total, item) => total + item.amount, 0),
                  0,
                ),
                overdue,
                collection_rate: due === 0 ? 100 : Math.round(((due - overdue) / due) * 100),
                monthly: ['2026-09', '2026-10', '2026-11'].map((month) => ({
                  month,
                  collected: live
                    .filter((payment) => payment.paid_at.startsWith(month))
                    .reduce((sum, payment) => sum + payment.amount, 0),
                })),
                recent_payments: live
                  .slice()
                  .reverse()
                  .slice(0, 8)
                  .map((payment) => {
                    const owner = studentOfInvoice(schoolId, payment.invoice_id)
                    return {
                      payment_id: payment.id,
                      receipt_number: payment.receipt_number,
                      paid_at: payment.paid_at,
                      amount: payment.amount,
                      student_name:
                        owner === undefined ? '' : studentRow(schoolId, owner).full_name,
                    }
                  }),
              }
            : null
          return route.fulfill({
            json: {
              data: {
                today: '2026-11-04',
                academic_year_label: '2026-2027',
                students: students.length,
                by_cycle: byCycle,
                finance,
                attendance: attendanceSummary(schoolId),
              },
            },
          })
        }
        if (path === '/billing/policy') {
          const schoolId = schoolHeader ?? ''
          if (request.method() === 'PUT') {
            if (!canEditSchool(schoolId)) return route.fulfill(forbidden)
            const body = z
              .object({
                departure: z.optional(z.string()),
                mobile_money: z.optional(
                  z.object({ fee_payer: z.enum(['school', 'guardian']), fee_rate_bps: z.number() }),
                ),
              })
              .parse(request.postDataJSON())
            if (body.departure !== undefined) policies.set(schoolId, body.departure)
            if (body.mobile_money !== undefined) mobileMoneyFees.set(schoolId, body.mobile_money)
          }
          return route.fulfill({
            json: {
              data: {
                departure: policies.get(schoolId) ?? 'cancel_unstarted',
                mobile_money: feesOf(schoolId),
              },
            },
          })
        }
        if (path.startsWith('/invoices/')) {
          const schoolId = schoolHeader ?? ''
          const [, , invoiceId, sub, itemId] = path.split('/')
          const invoice = invoicesOf(schoolId).find((candidate) => candidate.id === invoiceId)
          const student = studentsOf(schoolId).find(
            (candidate) => candidate.id === invoice?.student_id,
          )
          if (
            invoice === undefined ||
            student === undefined ||
            !canSee(schoolId, student, 'billing.view')
          )
            return route.fulfill({ status: 404, json: { message: 'Not Found' } })
          const cycleId = levelOfStudent(schoolId, student)?.cycle.id ?? null
          const isDiscount =
            sub === 'discounts' ||
            (sub === 'lines' &&
              invoice.lines.find((line) => line.id === itemId)?.kind === 'discount')
          if (!holds(schoolId, isDiscount ? 'billing.discount' : 'billing.manage', cycleId))
            return route.fulfill(forbidden)
          const today = '2026-11-04'
          if (sub === 'payments' && request.method() === 'POST') {
            const body = z
              .object({
                amount: z.number(),
                method: z.string(),
                reference: z.optional(z.nullable(z.string())),
              })
              .parse(request.postDataJSON())
            const remaining = invoiceResource(schoolId, invoice).balance.remaining
            if (remaining === 0)
              return route.fulfill({
                status: 409,
                json: { message: 'Réglée.', code: 'nothing_due' },
              })
            if (body.amount > remaining)
              return route.fulfill({
                status: 409,
                json: { message: 'Trop élevé.', code: 'amount_exceeds' },
              })
            const list = paymentsOf(schoolId)
            const payment: MockPayment = {
              id: nextBillingId(),
              invoice_id: invoice.id,
              receipt_number: `REC-2026-${String(list.length + 1).padStart(6, '0')}`,
              amount: body.amount,
              method: body.method,
              reference: body.method === 'cash' ? null : (body.reference ?? null),
              payer_name: invoiceResource(schoolId, invoice).payer?.name ?? '',
              cashier_name: current?.name ?? '',
              cashier_phone: current?.phone ?? '',
              paid_at: PAID_AT,
              cancellation: null,
            }
            list.push(payment)
            return route.fulfill({
              status: 201,
              json: { data: receiptResource(schoolId, payment) },
            })
          }
          if (sub === 'refunds' || sub === 'credit-transfers')
            return route.fulfill({
              status: 409,
              json: { message: 'Aucun crédit.', code: 'no_credit' },
            })
          const snapshot = invoice.lines.map((line) => ({
            ...line,
            installments: [...line.installments],
          }))
          if (sub === 'options' && request.method() === 'POST') {
            const body = z.object({ fee_type_id: z.string() }).parse(request.postDataJSON())
            if (invoice.lines.some((line) => line.fee_type_id === body.fee_type_id))
              return route.fulfill({
                status: 409,
                json: { message: 'Déjà présent.', code: 'option_present' },
              })
            const line = feeLine(schoolId, student, body.fee_type_id, today)
            if (line === null)
              return route.fulfill({
                status: 409,
                json: { message: 'Sans montant.', code: 'no_amount' },
              })
            invoice.lines.push(line)
          } else if (sub === 'options' && request.method() === 'DELETE') {
            const line = invoice.lines.find((candidate) => candidate.fee_type_id === itemId)
            if (line !== undefined) {
              line.installments = line.installments.filter((item) => item.due_on <= today)
              line.amount = line.installments.reduce((sum, item) => sum + item.amount, 0)
              if (line.amount === 0) invoice.lines.splice(invoice.lines.indexOf(line), 1)
            }
          } else if (sub === 'lines' && request.method() === 'POST') {
            const body = z
              .object({ label: z.string(), amount: z.number(), due_on: z.optional(z.string()) })
              .parse(request.postDataJSON())
            invoice.lines.push({
              id: nextBillingId(),
              kind: 'manual',
              fee_type_id: null,
              label: body.label,
              amount: body.amount,
              reason: null,
              installments: [
                { due_on: body.due_on ?? today, label: body.label, amount: body.amount },
              ],
            })
          } else if (sub === 'discounts') {
            const body = z
              .object({ amount: z.number(), reason: z.string() })
              .parse(request.postDataJSON())
            invoice.lines.push({
              id: nextBillingId(),
              kind: 'discount',
              fee_type_id: null,
              label: 'Remise',
              amount: -body.amount,
              reason: body.reason,
              installments: [],
            })
          } else if (sub === 'lines' && request.method() === 'DELETE') {
            const line = invoice.lines.find((candidate) => candidate.id === itemId)
            if (line === undefined)
              return route.fulfill({ status: 404, json: { message: 'Not Found' } })
            if (line.kind === 'fee')
              return route.fulfill({
                status: 422,
                json: { message: 'Frais de la grille.', errors: { line: ['Frais de la grille.'] } },
              })
            invoice.lines.splice(invoice.lines.indexOf(line), 1)
          }
          if (!rebalance(invoice)) {
            invoice.lines = snapshot
            return route.fulfill({
              status: 409,
              json: { message: 'Remise trop forte.', code: 'discount_exceeds' },
            })
          }
          return route.fulfill({ json: { data: invoiceResource(schoolId, invoice) } })
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
    switchSession: (account: Account) => {
      current = account
    },
  }
}
