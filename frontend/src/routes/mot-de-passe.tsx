import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useLogout, useMe } from '@/features/auth/api'
import { AuthShell } from '@/features/auth/components/AuthShell'
import { ChangePasswordForm } from '@/features/auth/components/ChangePasswordForm'
import { guard } from '@/features/auth/guard'
import { toast } from '@/lib/toast'

export const Route = createFileRoute('/mot-de-passe')({
  beforeLoad: async ({ context, location, preload }) => {
    await guard(context.queryClient, 'password', location.href, null, preload)
  },
  component: PasswordPage,
})

function PasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: profile } = useMe()
  const logout = useLogout()
  const required = profile?.must_change_password ?? false

  return (
    <AuthShell>
      <div className="grid gap-8">
        <div className="grid gap-2">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {t('auth.password.title')}
          </h1>
          <p className="text-muted-foreground">
            {t(required ? 'auth.password.subtitleRequired' : 'auth.password.subtitle')}
          </p>
        </div>
        <ChangePasswordForm
          required={required}
          onSuccess={() => {
            toast(t('auth.password.success'), { tone: 'success' })
            void navigate({ to: '/' })
          }}
        />
        {required ? (
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
        ) : (
          <Button asChild variant="ghost" className="justify-self-center">
            <Link to="/">{t('common.back')}</Link>
          </Button>
        )}
      </div>
    </AuthShell>
  )
}
