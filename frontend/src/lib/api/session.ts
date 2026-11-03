/**
 * Session côté client. L'authentification repose sur le cookie de session httpOnly posé par l'API
 * (Sanctum, mode SPA) : aucun jeton n'est stocké côté JavaScript.
 * Seul l'établissement sélectionné (identifiant non secret) est conservé, pour l'en-tête X-School-Id.
 */
const SCHOOL_KEY = 'gestion-ecole.school-id'

/** Préfixe des clés localStorage de l'application (vidées à la déconnexion). */
export const STORAGE_PREFIX = 'gestion-ecole.'

type Listener = () => void
const schoolListeners = new Set<Listener>()
const unauthorizedListeners = new Set<Listener>()

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    // Stockage indisponible (navigation privée, quota)
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
    // Ignoré : l'établissement reste sélectionné pour l'onglet courant via les écouteurs
  }
}

export const session = {
  getSchoolId: (): string | null => read(SCHOOL_KEY),
  setSchoolId: (schoolId: string | null): void => {
    write(SCHOOL_KEY, schoolId)
    schoolListeners.forEach((listener) => {
      listener()
    })
  },
  subscribeSchool: (listener: Listener): (() => void) => {
    schoolListeners.add(listener)
    return () => {
      schoolListeners.delete(listener)
    }
  },
  /** Session expirée ou absente (401) : l'application revient à l'écran de connexion. */
  onUnauthorized: (listener: Listener): (() => void) => {
    unauthorizedListeners.add(listener)
    return () => {
      unauthorizedListeners.delete(listener)
    }
  },
  notifyUnauthorized: (): void => {
    unauthorizedListeners.forEach((listener) => {
      listener()
    })
  },
}
