import { Link } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { Reveal } from '@/components/motion/Reveal'
import { ScreenHeader } from '@/components/ScreenHeader'
import { QueryState } from '@/components/states/QueryState'
import { Progress } from '@/components/ui/progress'
import { useAllowedCycles } from '@/features/auth/useAllowedCycles'
import { CYCLE_CLASSES } from '@/lib/cycles'
import { YEAR_LABEL } from '@/lib/demo/dates'
import { cn } from '@/lib/utils'

import { useClassrooms } from './api'

/** Classes et niveaux, regroupés par cycle. */
export function ClassesPage() {
  const { t } = useTranslation()
  const query = useClassrooms()
  const allowed = useAllowedCycles('school.settings.view')

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('classes.title')}
        description={t('classes.description', { year: YEAR_LABEL })}
      />
      <QueryState query={query}>
        {(groups) => (
          <div className="grid gap-8">
            {groups
              .filter((group) => allowed === undefined || allowed.includes(group.level.cycle))
              .map((group, groupIndex) => (
                <section
                  key={group.level.code}
                  aria-labelledby={`level-${group.level.code}`}
                  className="grid gap-3"
                >
                  <h2
                    id={`level-${group.level.code}`}
                    className="flex items-center gap-3 font-display text-lg font-semibold"
                  >
                    <span
                      aria-hidden
                      className={cn('h-6 w-1.5 rounded-full', CYCLE_CLASSES[group.level.cycle].dot)}
                    />
                    {group.level.name}
                    <CycleBadge code={group.level.cycle} label={t(`cycles.${group.level.cycle}`)} />
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {group.classrooms.map((classroom, index) => (
                      <Reveal key={classroom.id} index={groupIndex + index}>
                        <Link
                          from="/$school"
                          to="/$school/eleves"
                          search={{ classe: classroom.id }}
                          className={cn(
                            'grid gap-4 rounded-2xl border-l-4 bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift',
                            CYCLE_CLASSES[classroom.cycle].border,
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-display text-2xl font-bold">{classroom.name}</p>
                              <p className="text-sm text-muted-foreground">{classroom.room}</p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-semibold">
                              <Users aria-hidden className="size-4" />
                              {classroom.students}
                            </span>
                          </div>
                          <div className="grid gap-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{t('classes.fill')}</span>
                              <span>{t('classes.capacity', { count: classroom.capacity })}</span>
                            </div>
                            <Progress
                              value={Math.round((classroom.students / classroom.capacity) * 100)}
                              aria-label={t('classes.fill')}
                            />
                          </div>
                          <div className="flex flex-wrap justify-between gap-2 text-sm">
                            <span>
                              <span className="text-muted-foreground">
                                {t('classes.teacher')} :{' '}
                              </span>
                              <span className="font-medium">{classroom.teacher}</span>
                            </span>
                            <span className="text-muted-foreground">
                              {t('classes.girls', { count: classroom.girls })} ·{' '}
                              {t('classes.boys', { count: classroom.boys })}
                            </span>
                          </div>
                        </Link>
                      </Reveal>
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}
      </QueryState>
    </div>
  )
}
