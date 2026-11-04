import type { Page, Route } from '@playwright/test'
import { z } from 'zod'

import { E2E_API_URL } from './api.ts'

/**
 * API simulée (page.route) reprenant le contrat OpenAPI et les comptes du seeder de démonstration
 * (backend/database/seeders/DemoSeeder.php). Mot de passe commun : Demo2026!.
 */
export const DEMO_PASSWORD = 'Demo2026!'

type Role = 'promoter' | 'director' | 'secretary' | 'accountant' | 'teacher' | 'guardian'

const SCHOOLS = {
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
  'attendance.view': ['promoter', 'director', 'secretary', 'teacher', 'guardian'],
  'attendance.manage': ['director', 'secretary', 'teacher'],
  'attendance.justify': ['guardian'],
  'messaging.send': ['promoter', 'director', 'secretary', 'accountant', 'teacher', 'guardian'],
  'users.reset_password': ['director', 'secretary'],
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
}

export const ACCOUNTS = {
  promoter: {
    phone: '+2250700000002',
    name: 'Konan Promoteur',
    email: 'promoteur@demo.lecolso.ci',
    roles: [
      { school: 'lauriers', role: 'promoter' },
      { school: 'genies', role: 'promoter' },
    ],
  },
  director: {
    phone: '+2250700000003',
    name: 'Yao Directeur',
    email: 'directeur@demo.lecolso.ci',
    roles: [{ school: 'lauriers', role: 'director' }],
  },
  /** Directrice limitée à la maternelle (affectation avec cycle). */
  kindergartenDirector: {
    phone: '+2250700000004',
    name: 'Aminata Directrice maternelle',
    email: 'directrice.maternelle@demo.lecolso.ci',
    roles: [
      { school: 'lauriers', role: 'director', cycle: '0195f000-0000-7000-8000-0000000000c2' },
    ],
  },
  accountant: {
    phone: '+2250700000006',
    name: 'Moussa Comptable',
    email: 'comptable@demo.lecolso.ci',
    roles: [{ school: 'lauriers', role: 'accountant' }],
  },
  teacher: {
    phone: '+2250700000007',
    name: 'Fatou Enseignante',
    email: 'enseignante@demo.lecolso.ci',
    roles: [{ school: 'lauriers', role: 'teacher', cycle: CYCLE_PRIMARY }],
  },
  guardian: {
    phone: '+2250700000008',
    name: 'Kouadio Parent',
    email: 'parent@demo.lecolso.ci',
    roles: [
      { school: 'lauriers', role: 'guardian' },
      { school: 'genies', role: 'guardian' },
    ],
  },
  /** Compte créé par la direction avec un mot de passe provisoire. */
  provisional: {
    phone: '+2250700000010',
    name: 'Adjoua Secrétaire',
    email: 'nouvelle@demo.lecolso.ci',
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
    is_super_admin: false,
    can_be_remembered: !staff,
    schools: [...bySchool].map(([key, assignments]) => {
      const roles = assignments.map((assignment) => ({
        role: assignment.role,
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
  const origin = new URL(E2E_API_URL).origin

  await page.route(`${origin}/sanctum/csrf-cookie`, (route) => route.fulfill({ status: 204 }))

  await page.route(`${E2E_API_URL}/**`, async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const key = `${request.method()} ${path}`
    calls.set(key, (calls.get(key) ?? 0) + 1)

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
      default:
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

  return { calls }
}
