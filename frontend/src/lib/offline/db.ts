import { Dexie, type EntityTable } from 'dexie'

/**
 * Base locale (IndexedDB) pour le hors connexion : appel, saisie de notes, journal garderie.
 * Les écritures hors ligne vont dans `outbox`, puis sont envoyées à POST /api/v1/sync
 * (file de synchronisation : sprints suivants).
 */
export interface OutboxItem {
  /** UUID v7 généré côté client (lib/offline/uuid.ts), identique à l'id créé côté serveur. */
  id: string
  schoolId: string
  /** Type d'opération, ex. « attendance.mark ». */
  type: string
  payload: unknown
  /** Date ISO 8601 (UTC) de l'écriture locale. */
  createdAt: string
  attempts: number
}

export class OfflineDatabase extends Dexie {
  outbox!: EntityTable<OutboxItem, 'id'>

  constructor(name = 'gestion-ecole') {
    super(name)
    this.version(1).stores({
      outbox: 'id, schoolId, createdAt',
    })
  }
}

export const db = new OfflineDatabase()
