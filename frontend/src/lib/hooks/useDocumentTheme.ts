import { useEffect } from 'react'

import { useTheme } from '@/lib/theme'

/**
 * Applique le thème choisi sur <html> (fenêtres en portail comprises) tant que l'écran est affiché,
 * puis revient au clair. Réservé au back-office (et à la page /design).
 */
export function useDocumentTheme(): void {
  const theme = useTheme()
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    return () => {
      root.classList.remove('dark')
      root.style.colorScheme = ''
    }
  }, [theme])
}
