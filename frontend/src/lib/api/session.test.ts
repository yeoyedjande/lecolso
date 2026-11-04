import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'gestion-ecole.school-id'

// Module rechargé à chaque test : simule l'ouverture d'un nouvel onglet
async function openTab() {
  vi.resetModules()
  const { session } = await import('./session')
  return session
}

describe('session : établissement actif par onglet', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    window.localStorage.clear()
  })

  it('nouvel onglet : aucune école active (aucun X-School-Id deviné), la dernière sert à l’accueil', async () => {
    window.localStorage.setItem(KEY, 'ecole-a')
    const session = await openTab()

    expect(session.getSchoolId()).toBeNull()
    expect(session.getLastSchoolId()).toBe('ecole-a')
  })

  it('le choix fait dans un autre onglet ne change ni l’école ni l’en-tête de cet onglet', async () => {
    const session = await openTab()
    session.setSchoolId('ecole-a')

    // Autre onglet : il écrit directement dans le localStorage partagé
    window.localStorage.setItem(KEY, 'ecole-b')

    expect(session.getSchoolId()).toBe('ecole-a')
    expect(session.getLastSchoolId()).toBe('ecole-a')
    // … mais un onglet ouvert ensuite le propose pour son accueil
    expect((await openTab()).getLastSchoolId()).toBe('ecole-b')
  })

  it('un onglet sans école active n’en adopte jamais une choisie ailleurs', async () => {
    const session = await openTab()
    window.localStorage.setItem(KEY, 'ecole-b')
    expect(session.getSchoolId()).toBeNull()

    // Après un effacement explicite (déconnexion, 401) non plus
    session.setSchoolId('ecole-a')
    session.setSchoolId(null)
    window.localStorage.setItem(KEY, 'ecole-b')
    expect(session.getSchoolId()).toBeNull()
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
