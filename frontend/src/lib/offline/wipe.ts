import { session, STORAGE_PREFIX } from '@/lib/api/session'

import { db } from './db'

/**
 * Precache de Workbox (HTML, JS, CSS de l'application) : aucune donnée personnelle, et indispensable pour
 * rouvrir l'application hors connexion. Nom : « workbox-precache-v2-<portée du service worker> ».
 */
const APP_SHELL_CACHE_PREFIX = 'workbox-precache'

/**
 * Efface toutes les données locales de l'application (déconnexion, session expirée) :
 * base Dexie (file hors connexion), Cache Storage (sauf le precache de l'application), clés localStorage.
 * Chaque étape est tentée même si une autre échoue : il ne doit rien rester sur un appareil partagé.
 */
export async function clearLocalData(): Promise<void> {
  await Promise.allSettled([clearDexie(), clearCaches()])
  clearLocalStorage()
  // Établissement gardé en mémoire par l'onglet : oublié aussi
  session.setSchoolId(null)
}

async function clearDexie(): Promise<void> {
  // disableAutoOpen: false : la base se recrée à la prochaine écriture (sinon DatabaseClosedError
  // jusqu'au rechargement de la page, même après une nouvelle connexion)
  await db.delete({ disableAutoOpen: false })
}

async function clearCaches(): Promise<void> {
  if (!('caches' in globalThis)) {
    return
  }

  const keys = await caches.keys()
  await Promise.all(
    keys.filter((key) => !key.startsWith(APP_SHELL_CACHE_PREFIX)).map((key) => caches.delete(key)),
  )
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
