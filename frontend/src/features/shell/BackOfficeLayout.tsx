import { Outlet } from '@tanstack/react-router'
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { Logo, LogoMark } from '@/components/brand/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { useDocumentTheme } from '@/lib/hooks/useDocumentTheme'
import { cn } from '@/lib/utils'

import { ContextSwitcher } from './ContextSwitcher'
import { BACK_OFFICE_NAV, visibleSections } from './nav'
import { SpaceLink } from './SpaceLink'
import { UserMenu } from './UserMenu'

/** Menu replié : préférence d'affichage conservée hors du préfixe des données (survit à la déconnexion). */
const COLLAPSED_KEY = 'lecolso-ui.sidebar-collapsed'
const collapseListeners = new Set<() => void>()

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function writeCollapsed(value: boolean): void {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0')
  } catch {
    // Préférence non conservée
  }
  collapseListeners.forEach((listener) => {
    listener()
  })
}

function subscribeCollapsed(listener: () => void): () => void {
  collapseListeners.add(listener)
  return () => {
    collapseListeners.delete(listener)
  }
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation()
  const school = useCurrentSchool()
  const sections = visibleSections(BACK_OFFICE_NAV, school)

  return (
    <nav aria-label={t('common.menu')} className="grid gap-6">
      {sections.map((section) => (
        <div key={section.key} className="grid gap-1">
          {collapsed ? (
            <span className="mx-auto mb-1 h-px w-6 bg-white/15" aria-hidden />
          ) : (
            <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.08em] text-sidebar-muted uppercase">
              {t(`nav.sections.${section.key}`)}
            </p>
          )}
          <ul className="grid gap-0.5">
            {section.items.map((item) => {
              const Icon = item.icon
              const link = (
                <SpaceLink
                  space="gestion"
                  path={item.path}
                  aria-label={collapsed ? t(`nav.${item.key}`) : undefined}
                  className={cn(
                    'group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-sidebar-foreground/85 transition',
                    'hover:bg-sidebar-active hover:text-white',
                    collapsed && 'justify-center px-0',
                  )}
                  activeClassName="bg-sidebar-active !text-white before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-orange"
                  {...(onNavigate !== undefined ? { onClick: onNavigate } : {})}
                >
                  <Icon aria-hidden className="size-5 shrink-0" />
                  {!collapsed && <span className="truncate">{t(`nav.${item.key}`)}</span>}
                </SpaceLink>
              )
              return (
                <li key={item.key}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{t(`nav.${item.key}`)}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

/** Mise en page du back-office : menu latéral (repliable sur grand écran, tiroir sur tablette et téléphone). */
export function BackOfficeLayout() {
  const { t } = useTranslation()
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Mode sombre réservé au back-office
  useDocumentTheme()

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <a
        href="#contenu"
        className="sr-only z-50 rounded-xl bg-accent px-4 py-2 font-semibold text-accent-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('common.skipToContent')}
      </a>

      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col overflow-y-auto bg-sidebar print:hidden px-3 py-5 text-sidebar-foreground transition-[width] duration-300 lg:flex',
          collapsed ? 'w-20' : 'w-68',
        )}
      >
        <div
          className={cn(
            'mb-8 flex items-center px-2',
            collapsed ? 'justify-center' : 'justify-between',
          )}
        >
          {collapsed ? <LogoMark /> : <Logo inverted />}
        </div>
        <SidebarNav collapsed={collapsed} />
        <div className={cn('mt-auto pt-6', collapsed && 'flex justify-center')}>
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            className="text-sidebar-muted hover:bg-sidebar-active hover:text-white"
            onClick={() => {
              writeCollapsed(!collapsed)
            }}
            aria-label={collapsed ? t('common.expand') : undefined}
          >
            {collapsed ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
            {!collapsed && t('common.collapse')}
          </Button>
        </div>
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          closeLabel={t('common.close')}
          className="overflow-y-auto border-0 bg-sidebar p-4 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">{t('common.menu')}</SheetTitle>
          <SheetDescription className="sr-only">{t('spaces.gestion')}</SheetDescription>
          <div className="mb-6 px-2 pt-1">
            <Logo inverted />
          </div>
          <SidebarNav
            collapsed={false}
            onNavigate={() => {
              setDrawerOpen(false)
            }}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 print:hidden items-center gap-2 border-b bg-background/85 px-3 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={t('common.openMenu')}
            onClick={() => {
              setDrawerOpen(true)
            }}
          >
            <Menu aria-hidden />
          </Button>
          <ContextSwitcher space="gestion" className="min-w-0" />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main
          id="contenu"
          tabIndex={-1}
          className="flex-1 px-4 py-6 outline-none sm:px-6 lg:px-10 lg:py-8 print:p-0"
        >
          {/* Pas de fondu entre deux écrans : le contenu s'affiche dès qu'il est prêt */}
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
