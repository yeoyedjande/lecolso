import { createFileRoute, Link, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/states/EmptyState'
import { Button } from '@/components/ui/button'
import { useLogout, useMe } from '@/features/auth/api'
import { AuthShell } from '@/features/auth/components/AuthShell'
import { SchoolPicker } from '@/features/auth/components/SchoolPicker'
import { SPACE_HOME, spacesOf } from '@/features/auth/access'
import { guard, safeRedirect } from '@/features/auth/guard'
import { session } from '@/lib/api/session'
import { z } from 'zod/mini'

export const Route = createFileRoute('/etablissements')({
  validateSearch: z.object({ redirect: z.catch(z.optional(z.string()), undefined) }),
  beforeLoad: async ({ context, location, preload }) => {
    const { profile } = await guard(context.queryClient, 'schools', location.href, null, preload)
    const only = profile.schools.length === 1 ? profile.schools[0] : undefined
    if (only !== undefined) {
      // Un seul établissement : rien à choisir
      session.setSchoolId(only.id)
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- redirection TanStack Router
      throw redirect({ to: '/' })
    }
  },
  component: SchoolsPage,
})

function SchoolsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const router = useRouter()
  const search = Route.useSearch()
  const { data: profile } = useMe()
  const logout = useLogout()
  const currentId = useSyncExternalStore(
    session.subscribeSchool,
    session.getLastSchoolId,
    () => null,
  )
  const schools = profile?.schools ?? []

  return (
    <AuthShell>
      <div className="grid gap-8">
        <div className="grid gap-2">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {t('auth.schools.title')}
          </h1>
          {schools.length > 0 && (
            <p className="text-muted-foreground">{t('auth.schools.subtitle')}</p>
          )}
        </div>
        {schools.length === 0 ? (
          <EmptyState
            title={t('auth.schools.emptyTitle')}
            description={t('auth.schools.emptyDescription')}
            action={
              profile?.is_super_admin === true && (
                <Button asChild>
                  <Link to="/plateforme">{t('nav.platform')}</Link>
                </Button>
              )
            }
          />
        ) : (
          <SchoolPicker
            schools={schools}
            currentId={currentId}
            onPick={(school) => {
              // Lien profond vers cette école (chemin interne uniquement) : rouvert tel quel ;
              // sinon accueil de son premier espace. Les données en cache sont rangées par école (UUID).
              const back = safeRedirect(search.redirect)
              if (back?.startsWith(`/${school.slug}/`) === true) {
                router.history.push(back)
                return
              }
              const first = spacesOf(school)[0]
              if (first !== undefined) {
                void navigate({ to: SPACE_HOME[first], params: { school: school.slug } })
              }
            }}
          />
        )}
        <Button
          variant="ghost"
          className="justify-self-center"
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
    </AuthShell>
  )
}
