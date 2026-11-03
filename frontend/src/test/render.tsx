import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'

/** Rendu avec un QueryClient neuf, sans nouvel essai, pour des tests déterministes. */
export function renderWithQuery(ui: ReactElement): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}
