import { Link } from '@tanstack/react-router'
import {
  HeartHandshake,
  LogIn,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Smartphone,
  UserPlus,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Logo, LogoMark } from '@/components/brand/Logo'
import { HeroPattern } from '@/components/brand/Patterns'
import { CycleBadge } from '@/components/CycleBadge'
import { MoneyAmount } from '@/components/MoneyAmount'
import { Reveal } from '@/components/motion/Reveal'
import { DemoBanner } from '@/components/states/DemoBanner'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SchoolLogo } from '@/features/school/components/SchoolLogo'
import { CYCLE_CLASSES, cycleTone } from '@/lib/cycles'
import { YEAR_LABEL } from '@/lib/demo/dates'
import { formatPhone } from '@/lib/format'
import { cn } from '@/lib/utils'

import { usePublicFees, usePublicSchool, type PublicSchool } from '../api'

function Fees({ slug, school }: { slug: string; school: PublicSchool }) {
  const { t } = useTranslation()
  const query = usePublicFees(slug)
  const codes = new Set(school.cycles.flatMap((cycle) => cycle.levels))
  return (
    <QueryState query={query}>
      {({ levels, fees }) => (
        <div className="grid gap-3">
          <DemoBanner />
          <div className="overflow-hidden rounded-3xl border bg-card shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">{t('billing.fees.level')}</th>
                  <th className="px-4 py-3 text-right">{t('publicSchool.registration')}</th>
                  <th className="px-4 py-3 text-right">{t('publicSchool.tuition')}</th>
                </tr>
              </thead>
              <tbody>
                {levels
                  .filter((level) => codes.has(level.name) || codes.size === 0)
                  .map((level) => (
                    <tr key={level.code} className="border-t">
                      <td className="px-4 py-3">
                        <CycleBadge code={level.cycle} label={level.name} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MoneyAmount
                          value={
                            fees.find(
                              (fee) => fee.levelCode === level.code && fee.kind === 'registration',
                            )?.amount ?? 0
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <MoneyAmount
                          value={
                            fees.find(
                              (fee) => fee.levelCode === level.code && fee.kind === 'tuition',
                            )?.amount ?? 0
                          }
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">{t('publicSchool.feesHint')}</p>
        </div>
      )}
    </QueryState>
  )
}

/** Page publique d'une école (/{slug}) : sans connexion ni affectation, informations publiables seulement. */
export function PublicSchoolPage({ slug }: { slug: string }) {
  const { t } = useTranslation()
  const query = usePublicSchool(slug)
  const points = [
    { icon: Smartphone, text: t('publicSchool.points.follow') },
    { icon: ShieldCheck, text: t('publicSchool.points.safe') },
    { icon: HeartHandshake, text: t('publicSchool.points.pay') },
  ]

  return (
    <QueryState query={query}>
      {(school) =>
        school === null ? (
          <main
            id="contenu"
            className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-8 px-5 py-10"
          >
            <Logo />
            <EmptyState headingLevel={1} illustration="lost" title={t('publicSchool.notFound')} />
          </main>
        ) : (
          <div className="min-h-dvh bg-background">
            <header className="relative overflow-hidden bg-navy text-white">
              <HeroPattern className="pointer-events-none absolute inset-0 size-full opacity-90" />
              <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 pt-5">
                <span className="flex min-w-0 items-center gap-3">
                  {school.logo_url === null ? (
                    <LogoMark className="size-10 ring-1 ring-white/20" />
                  ) : (
                    <SchoolLogo url={school.logo_url} name={school.name} className="size-12" />
                  )}
                  <span className="font-display text-lg font-bold break-words">{school.name}</span>
                </span>
                <Button asChild size="sm" variant="secondary">
                  <Link to="/connexion">
                    <LogIn aria-hidden />
                    {t('publicSchool.login')}
                  </Link>
                </Button>
              </div>
              <div className="relative mx-auto grid max-w-5xl gap-5 px-5 pt-14 pb-16 sm:pt-20 sm:pb-24">
                {school.city !== null && (
                  <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
                    <MapPin aria-hidden className="size-4 text-orange" />
                    {t('publicSchool.heroCity', { city: school.city })}
                  </p>
                )}
                <h1 className="max-w-2xl font-display text-4xl leading-tight font-bold text-balance sm:text-5xl">
                  {t('publicSchool.hero', { name: school.name })}
                </h1>
                <p className="max-w-xl text-lg text-white/85">
                  {school.motto ?? t('publicSchool.heroText')}
                </p>
                <Button asChild variant="accent" size="lg" className="w-fit">
                  <Link to="/$school/preinscription" params={{ school: slug }}>
                    <UserPlus aria-hidden />
                    {t('publicSchool.preRegister')}
                  </Link>
                </Button>
              </div>
            </header>

            <main id="contenu" className="mx-auto grid max-w-5xl gap-14 px-5 py-12">
              <section aria-labelledby="cycles-title" className="grid gap-5">
                <h2 id="cycles-title" className="font-display text-2xl font-bold">
                  {t('publicSchool.cycles')}
                </h2>
                <ul className="grid gap-4 sm:grid-cols-3">
                  {school.cycles.map((cycle, index) => (
                    <li key={cycle.code}>
                      <Reveal index={index}>
                        <Card
                          className={cn(
                            'h-full border-t-4',
                            CYCLE_CLASSES[cycleTone(cycle.code)].border,
                          )}
                        >
                          <CardContent className="grid gap-2 pt-6">
                            <h3 className="font-display text-xl font-bold">{cycle.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {t('publicSchool.levels', { levels: cycle.levels.join(', ') })}
                            </p>
                          </CardContent>
                        </Card>
                      </Reveal>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="why-title" className="grid gap-5">
                <h2 id="why-title" className="font-display text-2xl font-bold">
                  {t('publicSchool.why')}
                </h2>
                <ul className="grid gap-4 sm:grid-cols-3">
                  {points.map(({ icon: Icon, text }) => (
                    <li
                      key={text}
                      className="flex items-start gap-3 rounded-2xl bg-card p-5 shadow-soft"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-100 text-accent-ink">
                        <Icon aria-hidden className="size-5" />
                      </span>
                      <span className="pt-1.5 font-medium">{text}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="fees-title" className="grid gap-5">
                <h2 id="fees-title" className="font-display text-2xl font-bold">
                  {t('publicSchool.fees', { year: YEAR_LABEL })}
                </h2>
                <Fees slug={slug} school={school} />
              </section>

              {(school.address !== null || school.phone !== null || school.email !== null) && (
                <section aria-labelledby="contact-title" className="grid gap-5">
                  <h2 id="contact-title" className="font-display text-2xl font-bold">
                    {t('publicSchool.contact')}
                  </h2>
                  <dl className="grid gap-4 sm:grid-cols-3">
                    {school.address !== null && (
                      <div className="grid gap-1 rounded-2xl border bg-card p-4">
                        <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin aria-hidden className="size-4" />
                          {t('publicSchool.address')}
                        </dt>
                        <dd className="font-medium break-words">{school.address}</dd>
                      </div>
                    )}
                    {school.phone !== null && (
                      <div className="grid gap-1 rounded-2xl border bg-card p-4">
                        <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone aria-hidden className="size-4" />
                          {t('publicSchool.phone')}
                        </dt>
                        <dd className="font-medium">
                          <a
                            className="tabular underline-offset-4 hover:underline"
                            href={`tel:${school.phone}`}
                          >
                            {formatPhone(school.phone)}
                          </a>
                        </dd>
                      </div>
                    )}
                    {school.email !== null && (
                      <div className="grid gap-1 rounded-2xl border bg-card p-4">
                        <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail aria-hidden className="size-4" />
                          {t('publicSchool.email')}
                        </dt>
                        <dd className="font-medium break-words">
                          <a
                            className="underline-offset-4 hover:underline"
                            href={`mailto:${school.email}`}
                          >
                            {school.email}
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}

              <section className="grid justify-items-center gap-4 rounded-3xl bg-navy px-6 py-10 text-center text-white">
                <p className="font-display text-2xl font-bold">{t('publicSchool.heroText')}</p>
                <Button asChild variant="accent" size="lg">
                  <Link to="/$school/preinscription" params={{ school: slug }}>
                    <UserPlus aria-hidden />
                    {t('publicSchool.preRegister')}
                  </Link>
                </Button>
              </section>
            </main>
            <footer className="border-t py-6 text-center text-sm text-muted-foreground">
              {t('publicSchool.footer')}
            </footer>
          </div>
        )
      }
    </QueryState>
  )
}
