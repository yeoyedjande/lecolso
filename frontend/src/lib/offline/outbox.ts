import { db, type OutboxItem } from './db'
import { uuidv7 } from './uuid'

/**
 * File des saisies hors connexion (appel, garderie, évaluations, notes, compétences). Chaque opération porte un UUID v7 généré ici :
 * POST /sync l'applique une seule fois, même rejouée. Les écouteurs sont prévenus à chaque changement (compteur
 * « X éléments en attente »).
 */
const listeners = new Set<() => void>()

export function onOutboxChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function notifyOutbox(): void {
  for (const listener of listeners) listener()
}

export async function enqueue(
  schoolId: string,
  type: string,
  payload: unknown,
): Promise<OutboxItem> {
  const item: OutboxItem = {
    id: uuidv7(),
    schoolId,
    type,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  await db.outbox.add(item)
  notifyOutbox()
  return item
}

export async function pendingCount(): Promise<number> {
  return db.outbox.count()
}

/** Une erreur de réseau (fetch impossible), pas une réponse refusée par l'API. */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError
}
