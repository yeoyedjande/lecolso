import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { z } from 'zod/mini'

import { meQueryOptions } from '@/features/auth/api'
import { AuthShell } from '@/features/auth/components/AuthShell'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { safeRedirect } from '@/features/auth/guard'

export const Route = createFileRoute('/connexion')({
  validateSearch: z.object({ redirect: z.catch(z.optional(z.string()), undefined) }),
  beforeLoad: ({ context }) => {
    // Déjà connecté (profil en cache) : inutile de se reconnecter
    if (context.queryClient.getQueryData(meQueryOptions.queryKey) !== undefined) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- redirection TanStack Router
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const search = Route.useSearch()

  return (
    <AuthShell>
      <div className="grid gap-8">
        <div className="grid gap-2">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {t('auth.login.title')}
          </h1>
          <p className="text-muted-foreground">{t('auth.login.subtitle')}</p>
        </div>
        <LoginForm
          onSuccess={() => {
            // Chemin interne uniquement (pas de redirection ouverte)
            router.history.push(safeRedirect(search.redirect) ?? '/')
          }}
        />
      </div>
    </AuthShell>
  )
}
