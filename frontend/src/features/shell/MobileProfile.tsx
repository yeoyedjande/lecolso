import { Link, useNavigate } from '@tanstack/react-router'
import { KeyRound, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLogout, useMe } from '@/features/auth/api'
import { distinctRoles, useRoleLabel } from '@/features/auth/roles'
import { formatPhone } from '@/lib/format'

/** Profil des espaces mobiles (parent, enseignant) : identité, mot de passe, déconnexion. */
export function MobileProfile() {
  const { t } = useTranslation()
  const roleLabel = useRoleLabel()
  const { data: profile } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  if (profile === undefined) return null

  return (
    <div className="grid gap-5">
      <h1 className="font-display text-2xl font-bold">{t('profile.title')}</h1>
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <Avatar name={profile.name} size="lg" />
          <div className="grid min-w-0 gap-0.5">
            <p className="truncate font-display text-lg font-bold">{profile.name}</p>
            <p className="tabular text-sm text-muted-foreground">{formatPhone(profile.phone)}</p>
            {profile.email !== null && (
              <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
            )}
          </div>
        </CardContent>
      </Card>
      <section aria-labelledby="schools-title" className="grid gap-2">
        <h2 id="schools-title" className="text-sm font-semibold">
          {t('profile.schools')}
        </h2>
        <ul className="grid gap-2">
          {profile.schools.map((school) => (
            <li
              key={school.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card px-4 py-3"
            >
              <span className="font-medium">{school.name}</span>
              <span className="flex flex-wrap gap-1">
                {distinctRoles(school).map((role) => (
                  <Badge key={role.role} variant="secondary">
                    {roleLabel(role)}
                  </Badge>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <Button asChild variant="outline" size="lg">
        <Link to="/mot-de-passe">
          <KeyRound aria-hidden />
          {t('profile.changePassword')}
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="lg"
        onClick={() => {
          logout.mutate(undefined, {
            onSettled: () => {
              void navigate({ to: '/connexion' })
            },
          })
        }}
      >
        <LogOut aria-hidden />
        {t('common.logout')}
      </Button>
    </div>
  )
}
