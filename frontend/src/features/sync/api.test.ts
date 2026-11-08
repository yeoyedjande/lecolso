import 'fake-indexeddb/auto'

import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'

import { session } from '@/lib/api/session'
import { db } from '@/lib/offline/db'
import { uuidv7 } from '@/lib/offline/uuid'
import { API_URL } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'

import { flushOutbox } from './api'

const SCHOOL_A = '01a1a06c-1400-7000-8000-00000000000a'
const SCHOOL_B = '01a1a06c-1400-7000-8000-00000000000b'

async function queue(count: number): Promise<void> {
  await db.outbox.bulkAdd(
    Array.from({ length: count }, (_, index) => ({
      id: uuidv7(),
      schoolId: SCHOOL_A,
      type: 'grades.save',
      payload: { index },
      createdAt: new Date(Date.UTC(2026, 10, 8, 8, 0, index)).toISOString(),
      attempts: 0,
    })),
  )
}

/** Répond « appliquée » à chaque opération reçue et note l'école de chaque requête. */
function acceptAll(schools: (string | null)[], onRequest?: () => void): void {
  server.use(
    http.post(`${API_URL}/sync`, async ({ request }) => {
      schools.push(request.headers.get('X-School-Id'))
      onRequest?.()
      const body: unknown = await request.json()
      const operations =
        typeof body === 'object' &&
        body !== null &&
        'operations' in body &&
        Array.isArray(body.operations)
          ? body.operations.flatMap((operation: unknown) =>
              typeof operation === 'object' &&
              operation !== null &&
              'id' in operation &&
              typeof operation.id === 'string'
                ? [operation.id]
                : [],
            )
          : []
      return HttpResponse.json({
        data: operations.map((id) => ({
          id,
          status: 'applied',
          code: null,
          message: null,
          replayed: false,
        })),
      })
    }),
  )
}

afterEach(async () => {
  await db.outbox.clear()
  session.setSchoolId(null)
})

describe('flushOutbox', () => {
  it('envoie toute la file de l’école par lots de 100', async () => {
    session.setSchoolId(SCHOOL_A)
    await queue(150)
    const schools: (string | null)[] = []
    acceptAll(schools)

    await expect(flushOutbox(SCHOOL_A)).resolves.toEqual({ applied: 150, rejected: [] })
    expect(schools).toEqual([SCHOOL_A, SCHOOL_A])
    expect(await db.outbox.count()).toBe(0)
  })

  it('s’arrête sans rien effacer si l’utilisateur change d’école pendant l’envoi', async () => {
    session.setSchoolId(SCHOOL_A)
    await queue(150)
    const schools: (string | null)[] = []
    // Changement d'école pendant la première requête : le lot suivant partirait vers l'école B
    acceptAll(schools, () => {
      session.setSchoolId(SCHOOL_B)
    })

    await expect(flushOutbox(SCHOOL_A)).resolves.toEqual({ applied: 0, rejected: [] })
    expect(schools).toEqual([SCHOOL_A])
    // Saisies gardées : renvoyées à la prochaine visite de l'école A (opérations idempotentes)
    expect(await db.outbox.where('schoolId').equals(SCHOOL_A).count()).toBe(150)
  })
})
