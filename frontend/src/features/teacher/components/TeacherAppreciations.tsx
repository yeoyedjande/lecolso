import { useNavigate } from '@tanstack/react-router'
import { MessageSquareText } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ClassPicker, TermSelect } from '@/components/ClassPicker'
import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton, QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useReportCards } from '@/features/grades/api'
import { AppreciationDialog } from '@/features/grades/components/ReportCardsPage'
import { formatAverage } from '@/lib/format'

import { useTeacherClasses } from '../api'

/** Appréciations du titulaire (générale et par matière), tant que la direction n'a pas validé la période. */
export function TeacherAppreciations({ classroomId }: { classroomId: string | undefined }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const classes = useTeacherClasses()
  const eligible = (classes.data ?? []).filter(
    (classroom) =>
      classroom.grading?.mode === 'weighted_average' || classroom.grading?.mode === 'competency',
  )
  const classroom = eligible.find((candidate) => candidate.id === classroomId) ?? eligible[0]
  const [termId, setTermId] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const query = useReportCards(classroom?.id ?? '', termId)

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="font-display text-2xl font-bold">{t('teacher.appreciations.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('teacher.appreciations.subtitle')}</p>
      </div>
      {classes.data === undefined ? (
        <ListSkeleton />
      ) : classroom === undefined ? (
        <EmptyState title={t('teacher.grades.noClass')} />
      ) : (
        <>
          <div className="grid gap-2">
            {eligible.length > 1 && (
              <ClassPicker
                classrooms={eligible}
                value={classroom.id}
                onChange={(id) => {
                  setTermId(null)
                  void navigate({
                    from: '/$school',
                    to: '/$school/enseignant/appreciations',
                    search: { classe: id },
                    replace: true,
                  })
                }}
              />
            )}
            <TermSelect
              terms={query.data?.terms ?? []}
              value={query.data?.term.id ?? ''}
              onChange={setTermId}
            />
          </div>
          <QueryState query={query}>
            {(data) => (
              <div className="grid gap-3">
                {data.closure !== null && (
                  <p className="rounded-xl bg-muted p-3 text-sm" role="status">
                    {t('teacher.appreciations.closed')}
                  </p>
                )}
                {data.rows.length === 0 ? (
                  <EmptyState title={t('grades.noStudent')} />
                ) : (
                  <ul className="grid gap-2">
                    {data.rows.map((row) => (
                      <li key={row.student.id}>
                        <Card>
                          <CardContent className="flex items-center gap-3 p-3">
                            <Avatar
                              name={row.student.full_name}
                              photoUrl={row.student.photo_url}
                              size="sm"
                            />
                            <span className="grid min-w-0 flex-1">
                              <span className="truncate font-medium">{row.student.full_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {data.document === 'skills_booklet'
                                  ? t('reportCards.skillsCounts', {
                                      a: row.skills?.A ?? 0,
                                      ea: row.skills?.EA ?? 0,
                                      na: row.skills?.NA ?? 0,
                                    })
                                  : t('teacher.grades.average', {
                                      value: formatAverage(row.average),
                                      scale: data.grade_scale,
                                    })}
                              </span>
                              <Badge
                                variant={row.teacher_comment === null ? 'accent' : 'secondary'}
                                className="mt-1 w-fit"
                              >
                                {row.teacher_comment === null
                                  ? t('reportCards.toWrite')
                                  : t('reportCards.written')}
                              </Badge>
                            </span>
                            <Button
                              variant="outline"
                              size="lg"
                              aria-label={t('teacher.appreciations.writeFor', {
                                name: row.student.full_name,
                              })}
                              onClick={() => {
                                setEditing(row.student.id)
                              }}
                            >
                              <MessageSquareText aria-hidden />
                              {t('teacher.appreciations.write')}
                            </Button>
                          </CardContent>
                        </Card>
                      </li>
                    ))}
                  </ul>
                )}
                {editing !== null &&
                  (() => {
                    const row = data.rows.find((candidate) => candidate.student.id === editing)
                    return row === undefined ? null : (
                      <AppreciationDialog
                        key={row.student.id}
                        data={data}
                        row={row}
                        onClose={() => {
                          setEditing(null)
                        }}
                      />
                    )
                  })()}
              </div>
            )}
          </QueryState>
        </>
      )}
    </div>
  )
}
