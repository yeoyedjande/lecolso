import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import type { Space } from '@/features/auth/access'

/**
 * Lien vers un écran d'un espace (`path` relatif, '' = accueil de l'espace). Les écrans pas encore livrés
 * sont servis par la route attrape-tout de l'espace (« Bientôt disponible »).
 */
export function SpaceLink({
  space,
  path,
  className,
  activeClassName,
  children,
  onClick,
  'aria-label': ariaLabel,
}: {
  space: Space
  path: string
  className?: string | undefined
  activeClassName?: string | undefined
  children: ReactNode
  onClick?: (() => void) | undefined
  'aria-label'?: string | undefined
}) {
  const common = {
    className,
    activeProps: { className: activeClassName, 'aria-current': 'page' as const },
    onClick,
    'aria-label': ariaLabel,
    children,
  }

  if (path === '') {
    const to = space === 'gestion' ? '/gestion' : space === 'enseignant' ? '/enseignant' : '/parent'
    return <Link to={to} activeOptions={{ exact: true, includeSearch: false }} {...common} />
  }

  const to =
    space === 'gestion' ? '/gestion/$' : space === 'enseignant' ? '/enseignant/$' : '/parent/$'
  return <Link to={to} params={{ _splat: path }} {...common} />
}
