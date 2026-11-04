import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Logo } from '@/components/brand/Logo'
import { EmptyState } from '@/components/states/EmptyState'
import { Button } from '@/components/ui/button'

/** Page introuvable (404 du routeur). */
export function NotFound() {
  const { t } = useTranslation()

  return (
    <main
      id="contenu"
      className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-8 px-5 py-10"
    >
      <Logo />
      <EmptyState
        illustration="lost"
        headingLevel={1}
        title={t('states.notFound.title')}
        description={t('states.notFound.description')}
        className="w-full"
        action={
          <Button asChild>
            <Link to="/">{t('states.notFound.action')}</Link>
          </Button>
        }
      />
    </main>
  )
}
