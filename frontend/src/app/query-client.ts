import { QueryClient } from '@tanstack/react-query'

import { UnauthorizedError, ValidationError } from '@/lib/api/errors'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // 3G instable : quelques essais, sauf pour les erreurs qui ne changeront pas en réessayant
        retry: (failureCount, error) =>
          !(error instanceof UnauthorizedError || error instanceof ValidationError) &&
          failureCount < 2,
      },
    },
  })
}
