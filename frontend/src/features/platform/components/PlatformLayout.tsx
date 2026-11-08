import { Link, Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Logo } from '@/components/brand/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { UserMenu } from '@/features/shell/UserMenu'
import { useDocumentTheme } from '@/lib/hooks/useDocumentTheme'

/** Espace super-admin : hors établissement, en-tête simple. */
export function PlatformLayout() {
  const { t } = useTranslation()
  useDocumentTheme()

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#contenu"
        className="sr-only z-50 rounded-xl bg-accent px-4 py-2 font-semibold text-accent-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('common.skipToContent')}
      </a>
      <header className="sticky top-0 z-30 border-b bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/plateforme" className="flex items-center gap-3">
            <Logo inverted />
            <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-semibold sm:inline">
              {t('nav.platform')}
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle className="text-sidebar-foreground hover:bg-sidebar-active hover:text-white" />
            <UserMenu compact />
          </div>
        </div>
      </header>
      <main
        id="contenu"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 outline-none sm:px-6 lg:py-8"
      >
        <Outlet />
      </main>
    </div>
  )
}
