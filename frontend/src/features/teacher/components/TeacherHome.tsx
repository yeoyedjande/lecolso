import { Link } from '@tanstack/react-router'
import {
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  MessageCircle,
  NotebookPen,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { Reveal } from '@/components/motion/Reveal'
import { DemoBanner } from '@/components/states/DemoBanner'
import { EmptyState } from '@/components/states/EmptyState'
import { CardsSkeleton, QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { useMe } from '@/features/auth/api'
import { CYCLE_CLASSES } from '@/lib/cycles'
import { cn } from '@/lib/utils'

import { useMyClasses } from '../api'

/** Accueil enseignant : ses classes et l'état de l'appel du jour, accès direct aux actions. */
export function TeacherHome() {
  const { t } = useTranslation()
  const { data: profile } = useMe()
  const classes = useMyClasses()

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <DemoBanner />
        <h1 className="font-display text-2xl font-bold">
          {t('teacher.home.greeting', { name: profile?.name.split(' ')[0] ?? '' })}
        </h1>
        <p className="text-muted-foreground">{t('teacher.home.subtitle')}</p>
      </div>
      <QueryState query={classes} skeleton={<CardsSkeleton count={2} />}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState title={t('teacher.home.noClass')} />
          ) : (
            <ul className="grid gap-3">
              {list.map((classroom, index) => (
                <li key={classroom.id}>
                  <Reveal index={index}>
                    <div
                      className={cn(
                        'grid gap-4 rounded-3xl border-l-[6px] bg-card p-4 shadow-soft',
                        CYCLE_CLASSES[classroom.cycle].border,
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid gap-1">
                          <h2 className="font-display text-2xl font-bold">{classroom.name}</h2>
                          <CycleBadge
                            code={classroom.cycle}
                            label={t('teacher.home.students', { count: classroom.students })}
                            className="w-fit"
                          />
                        </div>
                        {classroom.rollCallDone ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success-ink">
                            <CheckCircle2 aria-hidden className="size-3.5" />
                            {t('teacher.home.rollCallDone', { count: classroom.absentToday })}
                          </span>
                        ) : (
                          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-accent-ink">
                            {t('teacher.home.rollCallTodo')}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          asChild
                          variant={classroom.rollCallDone ? 'outline' : 'accent'}
                          size="lg"
                        >
                          <Link
                            from="/$school"
                            to="/$school/enseignant/appel"
                            search={{ classe: classroom.id }}
                          >
                            <ClipboardCheck aria-hidden />
                            {t('teacher.home.rollCall')}
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg">
                          <Link
                            from="/$school"
                            to="/$school/enseignant/notes"
                            search={{ classe: classroom.id }}
                          >
                            <GraduationCap aria-hidden />
                            {t('teacher.home.grades')}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          )
        }
      </QueryState>
      <div className="grid grid-cols-2 gap-2">
        <Button
          asChild
          variant="secondary"
          size="lg"
          className="h-auto min-h-12 py-2 text-center whitespace-normal"
        >
          <Link from="/$school" to="/$school/enseignant/journal">
            <NotebookPen aria-hidden />
            {t('teacher.home.journal')}
          </Link>
        </Button>
        <Button
          asChild
          variant="secondary"
          size="lg"
          className="h-auto min-h-12 py-2 text-center whitespace-normal"
        >
          <Link from="/$school" to="/$school/enseignant/messages">
            <MessageCircle aria-hidden />
            {t('teacher.home.messages')}
          </Link>
        </Button>
      </div>
    </div>
  )
}
