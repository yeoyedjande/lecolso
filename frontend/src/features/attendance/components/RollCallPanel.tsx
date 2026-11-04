import { CheckCheck, Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useMe } from '@/features/auth/api'
import { formatTime } from '@/lib/format'
import type { AttendanceStatus } from '@/lib/demo/types'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

import { useSaveRollCall } from '../api'
import type { RollCall } from '../demo'

const CHOICES: { status: 'present' | 'absent' | 'late'; tone: string }[] = [
  { status: 'present', tone: 'data-[on=true]:bg-success data-[on=true]:text-white data-[on=true]:border-success' },
  { status: 'absent', tone: 'data-[on=true]:bg-destructive data-[on=true]:text-white data-[on=true]:border-destructive' },
  { status: 'late', tone: 'data-[on=true]:bg-accent data-[on=true]:text-accent-foreground data-[on=true]:border-accent' },
]

/**
 * Appel en deux gestes : tout le monde est présent par défaut, un toucher marque un absent ou un retard,
 * puis « Enregistrer ». Cibles de 44 px, utilisable au téléphone.
 */
export function RollCallPanel({ call, editable, onSaved }: { call: RollCall; editable: boolean; onSaved?: () => void }) {
  const { t } = useTranslation()
  const { data: profile } = useMe()
  const save = useSaveRollCall()
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(call.rows.map((row) => [row.student.id, row.status === 'excused' ? 'absent' : row.status])),
  )
  const values = Object.values(statuses)
  const absent = values.filter((status) => status === 'absent').length
  const late = values.filter((status) => status === 'late').length

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={cn('text-sm', call.taken === null ? 'font-semibold text-accent-ink' : 'text-muted-foreground')}>
          {call.taken === null ? t('attendance.notTaken') : t('attendance.taken', { by: call.taken.by, time: formatTime(call.taken.at) })}
        </p>
        <p className="text-sm font-semibold" aria-live="polite">
          {t('attendance.summary', { present: values.length - absent - late, absent, late })}
        </p>
      </div>
      {editable && (
        <Button
          variant="outline"
          className="justify-self-start"
          onClick={() => {
            setStatuses(Object.fromEntries(call.rows.map((row) => [row.student.id, 'present'])))
          }}
        >
          <CheckCheck aria-hidden />
          {t('attendance.allPresent')}
        </Button>
      )}
      <ul className="grid gap-2 lg:grid-cols-2">
        {call.rows.map((row) => {
          const current = statuses[row.student.id] ?? 'present'
          return (
            <li key={row.student.id}>
              <Card className={cn('transition', current === 'absent' && 'border-destructive/50', current === 'late' && 'border-accent/60')}>
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                  <Avatar name={row.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
                  <div role="group" aria-label={row.name} className="flex gap-1">
                    {CHOICES.map((choice) => (
                      <button
                        key={choice.status}
                        type="button"
                        disabled={!editable}
                        data-on={current === choice.status}
                        aria-pressed={current === choice.status}
                        aria-label={t('attendance.statusFor', { status: t(`attendanceStatus.${choice.status}`), name: row.name })}
                        className={cn(
                          'min-h-11 min-w-11 rounded-xl border bg-surface px-3 text-sm font-semibold transition disabled:opacity-60',
                          choice.tone,
                        )}
                        onClick={() => {
                          setStatuses((previous) => ({ ...previous, [row.student.id]: choice.status }))
                        }}
                      >
                        {t(`attendanceShort.${choice.status}`)}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>
      {editable && (
        <div className="sticky bottom-4 z-10 flex justify-end">
          <Button
            size="lg"
            variant="accent"
            className="shadow-lift"
            disabled={save.isPending}
            onClick={() => {
              void save
                .mutateAsync({
                  classroomId: call.classroomId,
                  date: call.date,
                  takenBy: profile?.name ?? '',
                  entries: Object.entries(statuses).map(([studentId, status]) => ({ studentId, status })),
                })
                .then(() => {
                  toast(t('attendance.saved', { absent }), { tone: 'success' })
                  onSaved?.()
                })
            }}
          >
            <Save aria-hidden />
            {t(save.isPending ? 'attendance.saving' : 'attendance.save')}
          </Button>
        </div>
      )}
    </div>
  )
}
