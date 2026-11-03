import { STORAGE_PREFIX } from '@/lib/api/session'

import { db } from './db'

/**
 * Efface toutes les données locales de l'application (déconnexion, session expirée) :
 * base Dexie (file hors connexion), Cache Storage, clés localStorage de l'application.
 * Chaque étape est tentée même si une autre échoue : il ne doit rien rester sur un appareil partagé.
 */
export async function clearLocalData(): Promise<void> {
  await Promise.allSettled([clearDexie(), clearCaches()])
  clearLocalStorage()
}

async function clearDexie(): Promise<void> {
  await db.delete()
}

async function clearCaches(): Promise<void> {
  if (!('caches' in globalThis)) {
    return
  }

  const keys = await caches.keys()
  await Promise.all(keys.map((key) => caches.delete(key)))
}

function clearLocalStorage(): void {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX))
      .forEach((key) => {
        window.localStorage.removeItem(key)
      })
  } catch {
    // Stockage indisponible : rien à effacer
  }
}
