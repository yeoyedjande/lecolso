import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeftRight, Building2, Check, ChevronsUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SPACE_HOME, spacesOf, type Space } from '@/features/auth/access'
import { useMe } from '@/features/auth/api'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { useSchoolProfile } from '@/features/school/api'
import { SchoolLogo } from '@/features/school/components/SchoolLogo'
import { cn } from '@/lib/utils'

/**
 * Établissement courant et espaces accessibles : changer d'espace (plusieurs rôles) ou d'établissement
 * (plusieurs écoles). Sans choix possible, simple libellé.
 */
export function ContextSwitcher({
  space,
  className,
  inverted = false,
}: {
  space: Space
  className?: string
  inverted?: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: profile } = useMe()
  const school = useCurrentSchool()
  const identity = useSchoolProfile()

  if (school === null || profile === undefined) return null

  const spaces = spacesOf(school)
  const multipleSchools = profile.schools.length > 1
  const logoUrl = identity.data?.logo_url ?? null
  const label = (
    <span className="flex min-w-0 items-center gap-2.5">
      {logoUrl !== null && <SchoolLogo url={logoUrl} name={school.name} className="size-9" />}
      <span className="grid min-w-0 text-left leading-tight">
        <span className="truncate text-sm font-semibold">{school.name}</span>
        <span
          className={cn('truncate text-xs', inverted ? 'text-white/75' : 'text-muted-foreground')}
        >
          {t(`spaces.${space}`)}
        </span>
      </span>
    </span>
  )

  if (spaces.length < 2 && !multipleSchools) {
    return <div className={cn('flex min-w-0 items-center gap-2', className)}>{label}</div>
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex min-h-11 min-w-0 items-center gap-2 rounded-xl px-2 py-1 transition',
          inverted ? 'hover:bg-white/10' : 'hover:bg-muted',
          className,
        )}
      >
        {label}
        <span className="sr-only">{t('spaces.switch')}</span>
        <ChevronsUpDown
          aria-hidden
          className={cn('size-4 shrink-0', inverted ? 'text-white/75' : 'text-muted-foreground')}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {spaces.length > 1 && (
          <>
            <DropdownMenuLabel>{t('spaces.label')}</DropdownMenuLabel>
            {spaces.map((candidate) => (
              <DropdownMenuItem
                key={candidate}
                onSelect={() => {
                  void navigate({ to: SPACE_HOME[candidate], params: { school: school.slug } })
                }}
              >
                <ArrowLeftRight aria-hidden />
                <span className="flex-1">{t(`spaces.${candidate}`)}</span>
                {candidate === space && <Check aria-hidden className="text-accent-ink" />}
              </DropdownMenuItem>
            ))}
          </>
        )}
        {multipleSchools && (
          <>
            {spaces.length > 1 && <DropdownMenuSeparator />}
            <DropdownMenuItem asChild>
              <Link to="/etablissements">
                <Building2 aria-hidden />
                {t('auth.schools.switch')}
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
