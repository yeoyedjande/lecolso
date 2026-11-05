import { useEffect, useState } from 'react'

import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'
import { db } from '@/lib/offline/db'
import { notifyOutbox, onOutboxChange, pendingCount } from '@/lib/offline/outbox'
import { toast } from '@/lib/toast'

export type SyncResult = components['schemas']['SyncResultResource']
type SyncType = components['schemas']['SyncRequest']['operations'][number]['type']

const TYPES: readonly SyncType[] = ['attendance.roll_call', 'daycare.check', 'daycare.log']

const BATCH = 100

/**
 * Envoie la file hors connexion de l'école à POST /sync, par lots de 100. Opération appliquée (ou déjà traitée) :
 * retirée ; refusée : retirée et signalée (`rejected`) ; réseau coupé : gardée pour plus tard.
 */
export async function flushOutbox(
  schoolId: string,
): Promise<{ applied: number; rejected: SyncResult[] }> {
  const items = await db.outbox.where('schoolId').equals(schoolId).sortBy('createdAt')
  let applied = 0
  let changed = false
  const rejected: SyncResult[] = []

  for (let start = 0; start < items.length; start += BATCH) {
    const batch = items.slice(start, start + BATCH)
    const operations = batch.flatMap((item) => {
      const type = TYPES.find((candidate) => candidate === item.type)
      return type === undefined ? [] : [{ id: item.id, type, payload: item.payload }]
    })
    // Corps réel : les charges utiles JSON mises en file par les hooks (le contrat les décrit mal : `string[]`)
    const { data } = await api.POST('/sync', {
      body: { operations: [] },
      bodySerializer: () => JSON.stringify({ operations }),
    })
    if (data === undefined) {
      await db.outbox.bulkUpdate(
        batch.map((item) => ({ key: item.id, changes: { attempts: item.attempts + 1 } })),
      )
      break
    }
    await db.outbox.bulkDelete(data.data.map((result) => result.id))
    changed = true
    for (const result of data.data) {
      if (result.status === 'rejected') rejected.push(result)
      else applied += 1
    }
  }
  // Prévenir seulement si la file a changé : sinon l'envoi suivant ne relance rien en boucle
  if (changed) notifyOutbox()
  return { applied, rejected }
}

/** Nombre de saisies en attente d'envoi (toutes écoles de l'appareil). */
export function usePendingSync(): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const refresh = () => {
      void pendingCount().then(setCount)
    }
    refresh()
    return onOutboxChange(refresh)
  }, [])
  return count
}

/**
 * Envoie la file de l'école courante au retour du réseau, à l'ouverture et toutes les 30 secondes ; prévient
 * l'utilisateur des saisies refusées. Monté dans les espaces qui saisissent hors connexion.
 */
export function useOutboxSync(messages: {
  synced: (count: number) => string
  rejected: (message: string) => string
}): void {
  const school = useCurrentSchool()
  const schoolId = school?.id ?? null

  useEffect(() => {
    if (schoolId === null) return undefined
    let running = false
    const run = () => {
      if (running || !navigator.onLine) return
      running = true
      flushOutbox(schoolId)
        .then(({ applied, rejected }) => {
          if (applied > 0) toast(messages.synced(applied), { tone: 'success' })
          for (const result of rejected)
            toast(messages.rejected(result.message ?? ''), { tone: 'error' })
        })
        .catch(() => undefined)
        .finally(() => {
          running = false
        })
    }
    run()
    window.addEventListener('online', run)
    const timer = window.setInterval(run, 30_000)
    const stop = onOutboxChange(() => {
      if (navigator.onLine) window.setTimeout(run, 0)
    })
    return () => {
      window.removeEventListener('online', run)
      window.clearInterval(timer)
      stop()
    }
  }, [schoolId, messages])
}
