import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import type { Space } from '@/features/auth/access'

/**
 * Lien vers un écran d'un espace de l'établissement courant (`path` relatif, '' = accueil de l'espace :
 * tableau de bord, /parent ou /enseignant). Les écrans pas encore livrés
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
    // Menus : code de l'écran préchargé dès que le lien est visible (pas seulement au survol, absent sur
    // téléphone) ; le clic n'attend donc plus le téléchargement du module de la page
    preload: 'viewport' as const,
  }

  // Liens relatifs à l'établissement de l'URL (/{slug}/…) : le slug courant est repris tel quel
  if (path === '') {
    const to =
      space === 'gestion'
        ? '/$school/tableau-de-bord'
        : space === 'enseignant'
          ? '/$school/enseignant'
          : '/$school/parent'
    return (
      <Link
        from="/$school"
        to={to}
        activeOptions={{ exact: true, includeSearch: false }}
        {...common}
      />
    )
  }

  const to =
    space === 'gestion'
      ? '/$school/$'
      : space === 'enseignant'
        ? '/$school/enseignant/$'
        : '/$school/parent/$'
  return <Link from="/$school" to={to} params={{ _splat: path }} {...common} />
}
