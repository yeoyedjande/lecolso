/**
 * Session côté client : token Sanctum et établissement sélectionné.
 * Lu uniquement par le middleware du client HTTP (lib/api/client.ts).
 *
 * Provisoire : stockage dans localStorage. Le parcours de connexion (sprint 0, étape 6)
 * décidera du stockage définitif et du rafraîchissement de /me.
 */
const TOKEN_KEY = 'gestion-ecole.token'
const SCHOOL_KEY = 'gestion-ecole.school-id'

type Listener = () => void
const listeners = new Set<Listener>()

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    // Stockage indisponible (navigation privée, quota) : pas de session persistée
    return null
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(key)
    } else {
      window.localStorage.setItem(key, value)
    }
  } catch {
    // Ignoré : la session reste valable pour l'onglet courant via les écouteurs
  }
  listeners.forEach((listener) => {
    listener()
  })
}

export const session = {
  getToken: (): string | null => read(TOKEN_KEY),
  setToken: (token: string): void => {
    write(TOKEN_KEY, token)
  },
  getSchoolId: (): string | null => read(SCHOOL_KEY),
  setSchoolId: (schoolId: string | null): void => {
    write(SCHOOL_KEY, schoolId)
  },
  /** Déconnexion locale : token et établissement effacés. */
  clear: (): void => {
    write(TOKEN_KEY, null)
    write(SCHOOL_KEY, null)
  },
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
