import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { HealthStatus } from '@/features/system/components/HealthStatus'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{t('home.title')}</h1>
        <p className="text-muted-foreground">{t('home.subtitle')}</p>
      </header>
      <section aria-labelledby="health-title" className="flex flex-col gap-3">
        <h2 id="health-title" className="text-lg font-semibold">
          {t('health.title')}
        </h2>
        <HealthStatus />
      </section>
    </main>
  )
}
