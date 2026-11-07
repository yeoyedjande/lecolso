import { Link } from '@tanstack/react-router'
import { KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ScreenHeader } from '@/components/ScreenHeader'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useMe } from '@/features/auth/api'
import { distinctRoles, useRoleLabel } from '@/features/auth/roles'
import { formatPhone } from '@/lib/format'
import { setTheme, useTheme } from '@/lib/theme'

/** Profil de l'utilisateur connecté (vraie API /me) et préférences d'affichage. */
export function ProfilePage() {
  const { t } = useTranslation()
  const roleLabel = useRoleLabel()
  const { data: profile } = useMe()
  const theme = useTheme()

  if (profile === undefined) return null

  return (
    <div className="grid gap-6">
      <ScreenHeader title={t('profile.title')} description={t('profile.description')} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.account')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={profile.name} size="lg" />
              <div>
                <p className="font-display text-xl font-bold">{profile.name}</p>
                <p className="tabular text-muted-foreground">{formatPhone(profile.phone)}</p>
              </div>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase">
                  {t('profile.email')}
                </dt>
                <dd className="font-medium">{profile.email ?? t('profile.none')}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase">
                  {t('profile.phone')}
                </dt>
                <dd className="font-medium tabular">{formatPhone(profile.phone)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.schools')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3">
              {profile.schools.map((school) => (
                <li
                  key={school.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
                >
                  <span className="font-semibold">{school.name}</span>
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.security')}</CardTitle>
            <CardDescription>{t('profile.securityHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/mot-de-passe">
                <KeyRound aria-hidden />
                {t('profile.changePassword')}
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.appearance')}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start gap-3">
            <Switch
              id="dark-mode"
              checked={theme === 'dark'}
              onCheckedChange={(checked) => {
                setTheme(checked ? 'dark' : 'light')
              }}
            />
            <div className="grid gap-1">
              <Label htmlFor="dark-mode">{t('profile.dark')}</Label>
              <p className="text-sm text-muted-foreground">{t('profile.darkHint')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
