import { Link } from '@tanstack/react-router'
import {
  Baby,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  MessageCircle,
  MessageSquareText,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { Reveal } from '@/components/motion/Reveal'
import { EmptyState } from '@/components/states/EmptyState'
import { CardsSkeleton } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { useRollCall } from '@/features/attendance/api'
import { schoolToday } from '@/features/attendance/status'
import { useMe } from '@/features/auth/api'
import { CYCLE_CLASSES, cycleTone } from '@/lib/cycles'
import { cn } from '@/lib/utils'

import { useTeacherClasses, type TeacherClass } from '../api'

/** État de l'appel du jour d'une classe : fait (avec le nombre d'absents) ou à faire. */
function RollCallStatus({ classroom }: { classroom: TeacherClass }) {
  const { t } = useTranslation()
  const call = useRollCall(classroom.id, schoolToday())
  if (call.data == null) return null
  const absent = call.data.rows.filter((row) => row.status === 'absent').length
  return call.data.taken === null ? (
    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-accent-ink">
      {t('teacher.home.rollCallTodo')}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success-ink">
      <CheckCircle2 aria-hidden className="size-3.5" />
      {t('teacher.home.rollCallDone', { count: absent })}
    </span>
  )
}

function ClassCard({ classroom }: { classroom: TeacherClass }) {
  const { t } = useTranslation()
  const tone = cycleTone(classroom.cycle.code)
  const assessment = classroom.grading?.mode
  const graded = assessment === 'weighted_average' || assessment === 'competency'
  return (
    <div
      className={cn(
        'grid gap-4 rounded-3xl border-l-[6px] bg-card p-4 shadow-soft',
        CYCLE_CLASSES[tone].border,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="font-display text-2xl font-bold">{classroom.name}</h2>
          <CycleBadge code={classroom.cycle.code} label={classroom.cycle.name} className="w-fit" />
        </div>
        {classroom.attendanceMode === 'roll_call' && <RollCallStatus classroom={classroom} />}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {classroom.attendanceMode === 'roll_call' ? (
          <Button asChild variant="accent" size="lg">
            <Link from="/$school" to="/$school/enseignant/appel" search={{ classe: classroom.id }}>
              <ClipboardCheck aria-hidden />
              {t('teacher.home.rollCall')}
            </Link>
          </Button>
        ) : (
          <Button asChild variant="accent" size="lg">
            <Link from="/$school" to="/$school/enseignant/journal">
              <Baby aria-hidden />
              {t('teacher.home.daycare')}
            </Link>
          </Button>
        )}
        {graded && (
          <Button asChild variant="outline" size="lg">
            <Link from="/$school" to="/$school/enseignant/notes" search={{ classe: classroom.id }}>
              <GraduationCap aria-hidden />
              {assessment === 'competency' ? t('teacher.home.skills') : t('teacher.home.grades')}
            </Link>
          </Button>
        )}
        {graded && (
          <Button asChild variant="outline" size="lg">
            <Link
              from="/$school"
              to="/$school/enseignant/appreciations"
              search={{ classe: classroom.id }}
            >
              <MessageSquareText aria-hidden />
              {t('teacher.home.appreciations')}
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" size="lg">
          <Link from="/$school" to="/$school/enseignant/eleves" search={{ classe: classroom.id }}>
            <Users aria-hidden />
            {t('teacher.home.students')}
          </Link>
        </Button>
      </div>
    </div>
  )
}

/** Accueil enseignant : ses classes (titulaire), l'appel du jour et l'accès direct aux saisies. */
export function TeacherHome() {
  const { t } = useTranslation()
  const { data: profile } = useMe()
  const classes = useTeacherClasses()

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="font-display text-2xl font-bold">
          {t('teacher.home.greeting', { name: profile?.name.split(' ')[0] ?? '' })}
        </h1>
        <p className="text-muted-foreground">{t('teacher.home.subtitle')}</p>
      </div>
      {classes.data === undefined ? (
        <CardsSkeleton count={2} />
      ) : classes.data.length === 0 ? (
        <EmptyState title={t('teacher.home.noClass')} />
      ) : (
        <ul className="grid gap-3">
          {classes.data.map((classroom, index) => (
            <li key={classroom.id}>
              <Reveal index={index}>
                <ClassCard classroom={classroom} />
              </Reveal>
            </li>
          ))}
        </ul>
      )}
      <Button asChild variant="secondary" size="lg">
        <Link from="/$school" to="/$school/enseignant/messages">
          <MessageCircle aria-hidden />
          {t('teacher.home.messages')}
        </Link>
      </Button>
    </div>
  )
}
