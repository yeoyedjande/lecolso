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
    // Ignoré : l'établissement reste actif pour l'onglet courant (activeSchoolId)
  }
}

/**
 * Établissement actif de CET onglet (routage par chemin, ADR 0005) : celui de l'URL `/{slug}/…`, posé par la garde
 * des routes une fois l'appartenance vérifiée dans `/me`. Seul cet identifiant part dans X-School-Id : null tant
 * qu'aucun écran d'établissement n'est ouvert dans l'onglet (aucune école devinée), et un autre onglet n'y touche pas.
 * localStorage ne retient que la dernière école utilisée, pour l'accueil `/` d'un prochain onglet.
 */
let activeSchoolId: string | null = null

export const session = {
  /** École active de l'onglet (en-tête X-School-Id). */
  getSchoolId: (): string | null => activeSchoolId,
  /** Dernière école utilisée, tous onglets confondus (accueil `/`, `/compte`) : jamais envoyée à l'API. */
  getLastSchoolId: (): string | null => activeSchoolId ?? read(SCHOOL_KEY),
  setSchoolId: (schoolId: string | null): void => {
    activeSchoolId = schoolId
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
