import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Logo } from '@/components/brand/Logo'
import { HealthStatus } from '@/features/system/components/HealthStatus'

/** État du service (public, sans donnée personnelle) : utile en recette et pour le support. */
export const Route = createFileRoute('/etat')({
  component: HealthPage,
})

function HealthPage() {
  const { t } = useTranslation()

  return (
    <main id="contenu" className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
      <Logo />
      <h1 className="font-display text-2xl font-bold">{t('health.title')}</h1>
      <HealthStatus />
    </main>
  )
}
