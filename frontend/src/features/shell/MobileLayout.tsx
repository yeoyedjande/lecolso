import { Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { LogoMark } from '@/components/brand/Logo'
import { RibbonPattern } from '@/components/brand/Patterns'
import type { Space } from '@/features/auth/access'
import { cn } from '@/lib/utils'

import { OutboxSync } from '@/features/sync/OutboxSync'

import { ContextSwitcher } from './ContextSwitcher'
import type { NavItem } from './nav'
import { UnreadBadge } from '@/features/messaging/components/UnreadBadge'

import { SpaceLink } from './SpaceLink'
import { UserMenu } from './UserMenu'

/**
 * Mise en page mobile (parents, enseignants) pensée pour 360 px : en-tête compact, onglets en bas,
 * cibles tactiles de 44 px minimum. Toujours en thème clair.
 */
export function MobileLayout({
  space,
  tabs,
}: {
  space: Extract<Space, 'parent' | 'enseignant'>
  tabs: NavItem[]
}) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#contenu"
        className="sr-only z-50 rounded-xl bg-accent px-4 py-2 font-semibold text-accent-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('common.skipToContent')}
      </a>
      <header className="relative sticky top-0 z-30 overflow-hidden bg-navy text-white">
        <RibbonPattern className="pointer-events-none absolute inset-0 size-full opacity-60" />
        <div className="relative mx-auto flex h-16 max-w-2xl items-center gap-3 px-4">
          <LogoMark className="size-9 shrink-0 rounded-xl ring-1 ring-white/20" />
          <ContextSwitcher space={space} inverted className="min-w-0 flex-1" />
          <div className="rounded-full bg-white">
            <UserMenu compact />
          </div>
        </div>
      </header>

      <main
        id="contenu"
        tabIndex={-1}
        className="mx-auto w-full max-w-2xl flex-1 px-4 pt-5 pb-28 outline-none"
      >
        {/* Pas de fondu entre deux écrans : le contenu s'affiche dès qu'il est prêt */}
        <Outlet />
      </main>
      {/* Saisies faites hors connexion (appel, garderie, notes) envoyées au retour du réseau */}
      <OutboxSync />

      <nav
        aria-label={t('common.menu')}
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgb(27_37_89/0.18)] backdrop-blur"
      >
        <ul
          className="mx-auto grid max-w-2xl"
          style={{ gridTemplateColumns: `repeat(${String(tabs.length)}, minmax(0, 1fr))` }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <li key={tab.key}>
                <SpaceLink
                  space={space}
                  path={tab.path}
                  className={cn(
                    'relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium text-muted-foreground transition',
                    'hover:text-foreground',
                  )}
                  activeClassName="!text-navy after:absolute after:top-0 after:h-1 after:w-10 after:rounded-b-full after:bg-orange"
                >
                  <Icon aria-hidden className="size-6" />
                  {tab.key === 'messages' && (
                    <UnreadBadge className="absolute top-1.5 right-[calc(50%-1.75rem)]" />
                  )}
                  <span className="max-w-full truncate">{t(`nav.${tab.key}`)}</span>
                </SpaceLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
