import { HeartHandshake, ShieldCheck, Smartphone } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Logo } from '@/components/brand/Logo'
import { HeroPattern, RibbonPattern } from '@/components/brand/Patterns'
import { PageTransition } from '@/components/motion/Reveal'

/**
 * Mise en page des écrans d'accès (connexion, mot de passe, établissement) : panneau de marque bleu nuit
 * à gauche sur grand écran, bandeau compact sur téléphone.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  const points = [
    { icon: Smartphone, text: t('auth.login.heroPoints.families') },
    { icon: HeartHandshake, text: t('auth.login.heroPoints.staff') },
    { icon: ShieldCheck, text: t('auth.login.heroPoints.secure') },
  ]

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-navy text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <HeroPattern className="pointer-events-none absolute inset-0 size-full opacity-90" />
        <Logo inverted className="relative" />
        <div className="relative grid max-w-md gap-8">
          <p className="font-display text-4xl leading-tight font-bold text-balance">
            {t('auth.login.heroTitle')}
          </p>
          <ul className="grid gap-4">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-white/90">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10">
                  <Icon aria-hidden className="size-5 text-orange" />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/75">{t('brand.tagline')}</p>
      </aside>

      <div className="flex flex-col">
        <div className="relative overflow-hidden bg-navy px-5 pt-6 pb-10 lg:hidden">
          <RibbonPattern className="pointer-events-none absolute inset-0 size-full" />
          <Logo inverted className="relative" />
          <p className="relative mt-4 max-w-xs font-display text-xl leading-snug font-semibold text-white">
            {t('brand.tagline')}
          </p>
        </div>
        <main
          id="contenu"
          className="relative -mt-5 flex flex-1 items-start justify-center rounded-t-3xl bg-background px-5 py-8 sm:px-8 lg:mt-0 lg:items-center lg:rounded-none lg:py-12"
        >
          <PageTransition className="w-full max-w-md">{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}
