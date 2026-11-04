import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton, QueryState } from '@/components/states/QueryState'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { can } from '@/features/auth/access'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { ClassPicker } from '@/components/ClassPicker'
import { usePedagogyClasses } from '@/features/cycles/usePedagogyClasses'
import { demoToday, YEAR_START } from '@/lib/demo/dates'
import { formatLongDate } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useAbsences, useAttendanceHistory, useRollCall } from '../api'

import { RollCallPanel } from './RollCallPanel'

function History({ classroomId }: { classroomId: string }) {
  const { t } = useTranslation()
  const today = demoToday()
  const [month, setMonth] = useState(today.slice(0, 7))
  const from = `${month}-01` < YEAR_START ? YEAR_START : `${month}-01`
  const to = `${month}-31` > today ? today : `${month}-31`
  const query = useAttendanceHistory(classroomId, from, to)

  return (
    <div className="grid gap-4">
      <Field label={t('attendance.month')} className="max-w-xs">
        {(control) => (
          <Input
            {...control}
            type="month"
            min={YEAR_START.slice(0, 7)}
            max={today.slice(0, 7)}
            value={month}
            onChange={(event) => {
              if (event.target.value !== '') setMonth(event.target.value)
            }}
          />
        )}
      </Field>
      <QueryState query={query}>
        {(days) => {
          const taken = days.filter((day) => day.taken)
          const totalPresent = taken.reduce((sum, day) => sum + day.present, 0)
          const total = taken.reduce((sum, day) => sum + day.present + day.absent, 0)
          return (
            <div className="grid gap-3">
              <p className="font-semibold">
                {t('attendance.rate', {
                  rate: total === 0 ? 100 : Math.round((totalPresent / total) * 1000) / 10,
                })}
              </p>
              <Card className="overflow-hidden p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('attendance.day')}</TableHead>
                      <TableHead className="text-right">{t('attendance.present')}</TableHead>
                      <TableHead className="text-right">{t('attendance.absent')}</TableHead>
                      <TableHead className="text-right">{t('attendance.late')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...days].reverse().map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium capitalize">
                          {formatLongDate(day.date)}
                        </TableCell>
                        {day.taken ? (
                          <>
                            <TableCell className="text-right tabular">{day.present}</TableCell>
                            <TableCell
                              className={cn(
                                'text-right font-semibold tabular',
                                day.absent > 0 && 'text-destructive-ink',
                              )}
                            >
                              {day.absent}
                            </TableCell>
                            <TableCell className="text-right tabular">{day.late}</TableCell>
                          </>
                        ) : (
                          <TableCell colSpan={3} className="text-right">
                            <Badge variant="accent">{t('attendance.notTakenShort')}</Badge>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )
        }}
      </QueryState>
    </div>
  )
}

function TodayAbsences() {
  const { t } = useTranslation()
  const query = useAbsences()
  return (
    <QueryState query={query}>
      {(rows) =>
        rows.length === 0 ? (
          <EmptyState title={t('attendance.noAbsenceToday')} />
        ) : (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.student.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.classroom}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === 'late' ? 'accent' : 'destructive'}>
                        {t(`attendanceStatus.${row.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {row.justified
                        ? t('attendance.justified')
                        : t('students.detail.notJustified')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )
      }
    </QueryState>
  )
}

function RollCallTab({ classroomId, editable }: { classroomId: string; editable: boolean }) {
  const { t } = useTranslation()
  const today = demoToday()
  const [date, setDate] = useState(today)
  const query = useRollCall(classroomId, date)
  return (
    <div className="grid gap-4">
      <Field label={t('attendance.date')} className="max-w-xs">
        {(control) => (
          <Input
            {...control}
            type="date"
            min={YEAR_START}
            max={today}
            value={date}
            onChange={(event) => {
              if (event.target.value !== '') setDate(event.target.value)
            }}
          />
        )}
      </Field>
      <p className="text-sm text-muted-foreground first-letter:uppercase">{formatLongDate(date)}</p>
      <QueryState query={query}>
        {(call) => (
          <RollCallPanel
            key={`${classroomId}-${date}-${call.taken?.at ?? ''}`}
            call={call}
            editable={editable}
          />
        )}
      </QueryState>
    </div>
  )
}

/** Présences : appel (classes en « roll_call »), historique et absents du jour. */
export function AttendancePage() {
  const { t } = useTranslation()
  const school = useCurrentSchool()
  const { classrooms, loading } = usePedagogyClasses(
    'attendance.view',
    (settings) => settings.attendance_mode === 'roll_call',
  )
  const [classroomId, setClassroomId] = useState('')
  const classroom = classrooms.find((candidate) => candidate.id === classroomId) ?? classrooms[0]

  return (
    <div className="grid gap-6">
      <ScreenHeader title={t('attendance.title')} description={t('attendance.description')} />
      {loading ? (
        <ListSkeleton />
      ) : classroom === undefined ? (
        <EmptyState title={t('attendance.noClass')} />
      ) : (
        <Tabs defaultValue="rollCall">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="rollCall">{t('attendance.tabs.rollCall')}</TabsTrigger>
              <TabsTrigger value="history">{t('attendance.tabs.history')}</TabsTrigger>
              <TabsTrigger value="today">{t('attendance.tabs.today')}</TabsTrigger>
            </TabsList>
            <div className="w-full sm:w-56">
              <ClassPicker classrooms={classrooms} value={classroom.id} onChange={setClassroomId} />
            </div>
          </div>
          <TabsContent value="rollCall" className="mt-4">
            <RollCallTab classroomId={classroom.id} editable={can(school, 'attendance.manage')} />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <History classroomId={classroom.id} />
          </TabsContent>
          <TabsContent value="today" className="mt-4">
            <TodayAbsences />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
