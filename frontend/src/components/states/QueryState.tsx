import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'

import { ErrorState } from './ErrorState'

/**
 * États d'une requête : squelette pendant le chargement, erreur avec nouvel essai, module pas encore
 * disponible (démonstration désactivée), sinon le contenu.
 */
export function QueryState<T>({
  query,
  skeleton,
  children,
}: {
  query: UseQueryResult<T>
  skeleton?: ReactNode
  children: (data: T) => ReactNode
}) {
  const { t } = useTranslation()

  if (query.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void query.refetch()
        }}
      />
    )
  }
  if (query.data === undefined) {
    return (
      <div role="status" aria-label={t('common.loading')}>
        {skeleton ?? <ListSkeleton />}
      </div>
    )
  }
  return <>{children(query.data)}</>
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-10 w-full max-w-sm" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  )
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-32 w-full" />
      ))}
    </div>
  )
}
