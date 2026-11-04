import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'gestion-ecole.school-id'

// Module rechargé à chaque test : simule l'ouverture d'un nouvel onglet
async function openTab() {
  vi.resetModules()
  const { session } = await import('./session')
  return session
}

describe('session : établissement par onglet', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    window.localStorage.clear()
  })

  it('un nouvel onglet reprend le dernier établissement choisi', async () => {
    window.localStorage.setItem(KEY, 'ecole-a')
    const session = await openTab()

    expect(session.getSchoolId()).toBe('ecole-a')
  })

  it('le choix fait dans un autre onglet ne change ni l’école ni l’en-tête de cet onglet', async () => {
    const session = await openTab()
    session.setSchoolId('ecole-a')

    // Autre onglet : il écrit directement dans le localStorage partagé
    window.localStorage.setItem(KEY, 'ecole-b')

    expect(session.getSchoolId()).toBe('ecole-a')
    // … mais un onglet ouvert ensuite reprend le dernier choix
    expect((await openTab()).getSchoolId()).toBe('ecole-b')
  })

  it('prévient les écouteurs de l’onglet et retient le choix pour les prochains onglets', async () => {
    const session = await openTab()
    const listener = vi.fn()
    const unsubscribe = session.subscribeSchool(listener)

    session.setSchoolId('ecole-a')
    unsubscribe()
    session.setSchoolId('ecole-b')

    expect(listener).toHaveBeenCalledTimes(1)
    expect(window.localStorage.getItem(KEY)).toBe('ecole-b')
  })

  it('garde le choix en mémoire quand le stockage est indisponible', async () => {
    const session = await openTab()
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('indisponible')
    })

    session.setSchoolId('ecole-a')

    expect(session.getSchoolId()).toBe('ecole-a')
    setItem.mockRestore()
    getItem.mockRestore()
  })
})
