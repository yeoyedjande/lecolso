import { useSyncExternalStore } from 'react'

/**
 * Thème du back-office (clair / sombre). Préférence d'affichage, sans donnée personnelle : conservée
 * hors du préfixe « gestion-ecole. » pour survivre à la déconnexion. Défaut : préférence du système.
 */
export type Theme = 'light' | 'dark'

const KEY = 'lecolso-ui.theme'
const listeners = new Set<() => void>()

function stored(): Theme | null {
  try {
    const value = window.localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function getTheme(): Theme {
  return stored() ?? systemTheme()
}

export function setTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(KEY, theme)
  } catch {
    // Préférence non conservée : appliquée pour la session seulement
  }
  listeners.forEach((listener) => {
    listener()
  })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => 'light')
}
