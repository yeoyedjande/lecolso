import { useNavigate } from '@tanstack/react-router'
import { ChevronDown, KeyRound, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Avatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLogout, useMe } from '@/features/auth/api'
import { formatPhone } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Menu du compte : identité, changement de mot de passe, déconnexion. */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  const { data: profile } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()

  if (profile === undefined) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex min-h-11 items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-muted',
          compact && 'pr-1',
        )}
      >
        {/* Nom accessible = texte visible précédé de « Mon profil » (WCAG 2.5.3) */}
        <span className="sr-only">{t('common.profile')}</span>
        <Avatar name={profile.name} size="sm" />
        {!compact && (
          <>
            <span className="hidden max-w-40 truncate text-sm font-medium md:inline">
              {profile.name}
            </span>
            <ChevronDown aria-hidden className="hidden size-4 text-muted-foreground md:inline" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="grid gap-0.5">
          <span className="truncate font-semibold">{profile.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {formatPhone(profile.phone)}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void navigate({ to: '/mot-de-passe' })
          }}
        >
          <KeyRound aria-hidden />
          {t('auth.password.title')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            logout.mutate(undefined, {
              onSettled: () => {
                void navigate({ to: '/connexion' })
              },
            })
          }}
        >
          <LogOut aria-hidden />
          {t('common.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
