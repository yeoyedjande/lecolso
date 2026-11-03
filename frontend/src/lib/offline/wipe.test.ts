import { afterEach, describe, expect, it, vi } from 'vitest'

import { db } from './db'
import { clearLocalData } from './wipe'

describe('clearLocalData', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('vide Dexie, Cache Storage et les clés localStorage de l’application', async () => {
    const deleteDb = vi.spyOn(db, 'delete').mockResolvedValue(undefined)
    const deletedCaches: string[] = []
    vi.stubGlobal('caches', {
      keys: () =>
        Promise.resolve(['assets', 'api-ancien', 'workbox-precache-v2-https://app.exemple.ci/']),
      delete: (key: string) => {
        deletedCaches.push(key)
        return Promise.resolve(true)
      },
    })
    window.localStorage.setItem('gestion-ecole.school-id', 'ecole-1')
    window.localStorage.setItem('autre-application', 'garder')

    await clearLocalData()

    // La base reste réutilisable après sa suppression (réouverture automatique conservée)
    expect(deleteDb).toHaveBeenCalledExactlyOnceWith({ disableAutoOpen: false })
    // Le precache de l'application (sans donnée personnelle) est conservé pour rouvrir hors connexion
    expect(deletedCaches).toEqual(['assets', 'api-ancien'])
    expect(window.localStorage.getItem('gestion-ecole.school-id')).toBeNull()
    expect(window.localStorage.getItem('autre-application')).toBe('garder')
  })

  it('vide les caches et localStorage même si Dexie échoue', async () => {
    vi.spyOn(db, 'delete').mockRejectedValue(new Error('IndexedDB indisponible'))
    const deleteCache = vi.fn(() => Promise.resolve(true))
    vi.stubGlobal('caches', { keys: () => Promise.resolve(['assets']), delete: deleteCache })
    window.localStorage.setItem('gestion-ecole.school-id', 'ecole-1')

    await clearLocalData()

    expect(deleteCache).toHaveBeenCalledWith('assets')
    expect(window.localStorage.getItem('gestion-ecole.school-id')).toBeNull()
  })
})
