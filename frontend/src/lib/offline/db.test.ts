import 'fake-indexeddb/auto'

import { describe, expect, it } from 'vitest'

import { db } from './db'
import { uuidv7 } from './uuid'
import { clearLocalData } from './wipe'

function outboxItem(type: string) {
  return {
    id: uuidv7(),
    schoolId: '01a1a06c-1400-7000-8000-000000000001',
    type,
    payload: { present: true },
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
}

describe('base hors connexion (IndexedDB réelle via fake-indexeddb)', () => {
  it('se vide à la déconnexion puis reste utilisable sans recharger la page', async () => {
    await db.outbox.add(outboxItem('attendance.mark'))
    expect(await db.outbox.count()).toBe(1)

    // Déconnexion : la base est supprimée…
    await clearLocalData()

    // …puis se recrée vide à la prochaine opération (pas de DatabaseClosedError)
    expect(await db.outbox.count()).toBe(0)
    await db.outbox.add(outboxItem('grades.save'))
    expect(await db.outbox.count()).toBe(1)
  })
})
