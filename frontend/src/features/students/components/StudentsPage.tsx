import { Link, useNavigate } from '@tanstack/react-router'
import { FileSpreadsheet, Search, UserPlus } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { MoneyAmount } from '@/components/MoneyAmount'
import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Can } from '@/features/auth/RequirePermission'
import { useAllowedCycles } from '@/features/auth/useAllowedCycles'
import { useClassroomOptions } from '@/features/classes/api'
import { YEAR_LABEL } from '@/lib/demo/dates'
import type { CycleCode } from '@/lib/demo/types'

import { useStudents } from '../api'

const PAGE = 30
const CYCLES: CycleCode[] = ['daycare', 'kindergarten', 'primary']

export interface StudentsSearch {
  q?: string | undefined
  cycle?: CycleCode | undefined
  classe?: string | undefined
}

/** Liste des élèves, filtrable par cycle, classe et recherche (filtres dans l'URL). */
export function StudentsPage({ search }: { search: StudentsSearch }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState(search.q ?? '')
  const deferred = useDeferredValue(query)
  const [limit, setLimit] = useState(PAGE)
  const allowedCycles = useAllowedCycles('students.view')
  const classes = useClassroomOptions()
  const students = useStudents({
    search: deferred,
    cycle: search.cycle,
    classroomId: search.classe,
    allowedCycles,
  })

  const update = (patch: Partial<StudentsSearch>) => {
    setLimit(PAGE)
    void navigate({
      to: '/gestion/eleves',
      search: (previous) => ({ ...previous, ...patch }),
      replace: true,
    })
  }

  const visibleCycles = CYCLES.filter(
    (cycle) => allowedCycles === undefined || allowedCycles.includes(cycle),
  )
  const classOptions = (classes.data ?? []).filter(
    (classroom) =>
      (search.cycle === undefined || classroom.cycle === search.cycle) &&
      (allowedCycles === undefined || allowedCycles.includes(classroom.cycle)),
  )

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('students.title')}
        description={t('students.description', { year: YEAR_LABEL })}
        actions={
          <Can permission="students.manage">
            <Button asChild variant="outline">
              <Link to="/gestion/import">
                <FileSpreadsheet aria-hidden />
                {t('students.import')}
              </Link>
            </Button>
            <Button asChild variant="accent">
              <Link to="/gestion/inscriptions">
                <UserPlus aria-hidden />
                {t('students.enroll')}
              </Link>
            </Button>
          </Can>
        }
      />

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_200px]">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label={t('students.search')}
            placeholder={t('students.search')}
            className="pl-10"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setLimit(PAGE)
            }}
            onBlur={() => {
              update({ q: query === '' ? undefined : query })
            }}
          />
        </div>
        <NativeSelect
          aria-label={t('students.cycle')}
          value={search.cycle ?? ''}
          onChange={(event) => {
            const value = CYCLES.find((cycle) => cycle === event.target.value)
            update({ cycle: value, classe: undefined })
          }}
        >
          <option value="">{t('common.allCycles')}</option>
          {visibleCycles.map((cycle) => (
            <option key={cycle} value={cycle}>
              {t(`cycles.${cycle}`)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label={t('students.classroom')}
          value={search.classe ?? ''}
          onChange={(event) => {
            update({ classe: event.target.value === '' ? undefined : event.target.value })
          }}
        >
          <option value="">{t('common.allClasses')}</option>
          {classOptions.map((classroom) => (
            <option key={classroom.id} value={classroom.id}>
              {classroom.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <QueryState query={students}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              illustration="search"
              title={t('students.emptyTitle')}
              description={t('students.emptyDescription')}
            />
          ) : (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {t('students.count', { count: rows.length })}
              </p>
              <Card className="hidden overflow-hidden p-0 md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('students.student')}</TableHead>
                      <TableHead>{t('students.classroom')}</TableHead>
                      <TableHead>{t('students.payer')}</TableHead>
                      <TableHead className="text-right">{t('students.situation')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, limit).map((row) => (
                      <TableRow key={row.student.id} className="relative">
                        <TableCell>
                          <Link
                            to="/gestion/eleves/$studentId"
                            params={{ studentId: row.student.id }}
                            className="flex items-center gap-3 font-semibold after:absolute after:inset-0 hover:underline"
                          >
                            <Avatar name={row.name} size="sm" />
                            <span className="grid">
                              <span>{row.name}</span>
                              <span className="text-xs font-normal text-muted-foreground">
                                {row.student.matricule}
                              </span>
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <CycleBadge code={row.classroom.cycle} label={row.classroom.name} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.payer}</TableCell>
                        <TableCell className="text-right">
                          {row.overdue > 0 ? (
                            <Badge variant="destructive">
                              {t('students.overdue')}
                              <MoneyAmount value={row.overdue} />
                            </Badge>
                          ) : (
                            <Badge variant="success">{t('students.upToDate')}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              <ul className="grid gap-2 md:hidden">
                {rows.slice(0, limit).map((row) => (
                  <li key={row.student.id}>
                    <Link
                      to="/gestion/eleves/$studentId"
                      params={{ studentId: row.student.id }}
                      className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft"
                    >
                      <Avatar name={row.name} />
                      <span className="grid min-w-0 flex-1 gap-1">
                        <span className="truncate font-semibold">{row.name}</span>
                        <CycleBadge
                          code={row.classroom.cycle}
                          label={row.classroom.name}
                          className="w-fit"
                        />
                      </span>
                      {row.overdue > 0 ? (
                        <MoneyAmount
                          value={row.overdue}
                          className="text-sm font-semibold text-destructive-ink"
                        />
                      ) : (
                        <Badge variant="success">{t('students.upToDate')}</Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              {rows.length > limit && (
                <Button
                  variant="outline"
                  className="justify-self-center"
                  onClick={() => {
                    setLimit((value) => value + PAGE)
                  }}
                >
                  {t('students.showMore')}
                </Button>
              )}
            </div>
          )
        }
      </QueryState>
    </div>
  )
}
