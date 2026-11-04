import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { MotionProvider } from '@/components/motion/Reveal'
import { OfflineBanner } from '@/components/states/OfflineBanner'
import { Toaster } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NotFound } from '@/features/shell/NotFound'
import { RouteError } from '@/features/shell/RouteError'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
})

function RootLayout() {
  const { t } = useTranslation()

  return (
    <MotionProvider>
      <TooltipProvider delayDuration={300}>
        <div className="min-h-dvh bg-background">
          <OfflineBanner />
          <Outlet />
        </div>
        <Toaster closeLabel={t('common.close')} />
      </TooltipProvider>
    </MotionProvider>
  )
}
