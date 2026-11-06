import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ClassPicker } from '@/components/ClassPicker'
import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useStudentList } from '@/features/students/api'
import { formatPhone } from '@/lib/format'

import { useTeacherClasses } from '../api'

/** Élèves d'une classe de l'enseignant, avec le parent à contacter ; la fiche s'ouvre en lecture seule. */
export function TeacherStudents({ classroomId }: { classroomId: string | undefined }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const classes = useTeacherClasses()
  const classroom =
    (classes.data ?? []).find((candidate) => candidate.id === classroomId) ?? classes.data?.[0]
  const students = useStudentList({
    search: '',
    cycleId: null,
    classroomId: classroom?.id ?? null,
    status: 'active',
  })
  const rows = students.data?.pages.flatMap((page) => page.data) ?? []

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="font-display text-2xl font-bold">{t('teacher.students.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('teacher.students.subtitle')}</p>
      </div>
      {classes.data === undefined ? (
        <ListSkeleton />
      ) : classroom === undefined ? (
        <EmptyState title={t('teacher.home.noClass')} />
      ) : (
        <>
          {classes.data.length > 1 && (
            <ClassPicker
              classrooms={classes.data}
              value={classroom.id}
              onChange={(id) => {
                void navigate({
                  from: '/$school',
                  to: '/$school/enseignant/eleves',
                  search: { classe: id },
                  replace: true,
                })
              }}
            />
          )}
          {students.isPending ? (
            <ListSkeleton />
          ) : rows.length === 0 ? (
            <EmptyState title={t('grades.noStudent')} />
          ) : (
            <ul className="grid gap-2">
              {rows.map((student) => (
                <li key={student.id}>
                  <Card className="p-0">
                    <Link
                      from="/$school"
                      to="/$school/enseignant/eleves/$studentId"
                      params={{ studentId: student.id }}
                      className="flex min-h-14 items-center gap-3 rounded-[inherit] p-3"
                    >
                      <Avatar name={student.full_name} photoUrl={student.photo_url} size="sm" />
                      <span className="grid min-w-0 flex-1">
                        <span className="truncate font-medium">{student.full_name}</span>
                        {student.primary_contact !== null && (
                          <span className="truncate text-xs text-muted-foreground">
                            {t('teacher.students.contact', {
                              name: student.primary_contact.name,
                              phone: formatPhone(student.primary_contact.phone),
                            })}
                          </span>
                        )}
                      </span>
                      <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
                    </Link>
                  </Card>
                </li>
              ))}
            </ul>
          )}
          {students.hasNextPage && (
            <Button
              variant="outline"
              size="lg"
              className="justify-self-center"
              disabled={students.isFetchingNextPage}
              onClick={() => void students.fetchNextPage()}
            >
              {t('students.showMore')}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
