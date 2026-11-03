import { useTranslation } from 'react-i18next'

import { RibbonPattern, StateIllustration } from '@/components/brand/Patterns'
import { useMe } from '@/features/auth/api'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'

/** Accueil provisoire d'un espace (les tableaux de bord arrivent en 6b et 6c). */
export function SpaceHome() {
  const { t } = useTranslation()
  const { data: profile } = useMe()
  const school = useCurrentSchool()
  const firstName = profile?.name.split(' ')[0] ?? ''

  return (
    <div className="grid gap-6">
      <section className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white shadow-lift sm:p-8">
        <RibbonPattern className="pointer-events-none absolute inset-0 size-full" />
        <div className="relative grid gap-2">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {t('welcome.greeting', { name: firstName })}
          </h1>
          <p className="text-white/85">{t('welcome.subtitle', { school: school?.name ?? '' })}</p>
        </div>
      </section>
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/60 px-6 py-10 text-center">
        <StateIllustration name="soon" />
        <p className="text-muted-foreground">{t('welcome.soon')}</p>
      </div>
    </div>
  )
}
