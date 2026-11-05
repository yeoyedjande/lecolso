import { Link } from '@tanstack/react-router'
import { DoorOpen, Pencil, Plus, Trash2, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentAcademicYear } from '@/features/academic/api'
import { can } from '@/features/auth/access'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { useCycles } from '@/features/cycles/api'
import { useSchoolUsers } from '@/features/users/api'
import { CYCLE_CLASSES, cycleTone } from '@/lib/cycles'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

import { useClassroomList, useDeleteClassroom, type Classroom } from './api'
import { ClassroomSheet, type TeacherOption } from './components/ClassroomSheet'

function ClassesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-40" />
      ))}
    </div>
  )
}

/** Regroupe les classes (déjà triées par l'API) par niveau, dans l'ordre reçu. */
function byLevel(classrooms: Classroom[]) {
  const groups = new Map<string, { level: Classroom['level']; classrooms: Classroom[] }>()
  for (const classroom of classrooms) {
    const group = groups.get(classroom.level.id) ?? { level: classroom.level, classrooms: [] }
    group.classrooms.push(classroom)
    groups.set(classroom.level.id, group)
  }
  return [...groups.values()]
}

/** Classes de l'année en cours (vraie API), par niveau ; création, modification, suppression. */
export function ClassesPage() {
  const { t } = useTranslation()
  const school = useCurrentSchool()
  const year = useCurrentAcademicYear()
  const query = useClassroomList()
  const cycles = useCycles()
  const remove = useDeleteClassroom()
  const canListUsers = can(school, ['users.view', 'users.reset_password'])
  const teachers = useSchoolUsers({ search: '', role: 'teacher', status: 'active' }, canListUsers)
  const [editing, setEditing] = useState<Classroom | 'new' | null>(null)
  const [toDelete, setToDelete] = useState<Classroom | null>(null)
  const manageScope = school?.permissions['school.settings.manage']
  const canCreate = manageScope !== undefined

  const teacherOptions = (current: Classroom | null): TeacherOption[] | null => {
    if (!canListUsers || teachers.data === undefined) return null
    const options = teachers.data.pages.flatMap((page) =>
      page.data.map((user) => ({ id: user.id, name: user.name })),
    )
    const kept = current?.homeroom_teacher
    return kept != null && !options.some((option) => option.id === kept.id)
      ? [kept, ...options]
      : options
  }

  const confirmDelete = async () => {
    if (toDelete === null) return
    try {
      await remove.mutateAsync(toDelete.id)
      toast(t('classes.deleteDialog.done', { name: toDelete.name }), { tone: 'success' })
    } catch {
      toast(t('common.error'), { tone: 'error' })
    } finally {
      setToDelete(null)
    }
  }

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('classes.title')}
        description={
          year == null
            ? t('classes.descriptionNoYear')
            : t('classes.description', { year: year.label })
        }
        demo={false}
        actions={
          canCreate &&
          year != null && (
            <Button
              variant="accent"
              disabled={cycles.data === undefined}
              onClick={() => {
                setEditing('new')
              }}
            >
              <Plus aria-hidden />
              {t('classes.create')}
            </Button>
          )
        }
      />

      {year === null ? (
        <EmptyState
          title={t('classes.noYearTitle')}
          description={t('classes.noYearDescription')}
          action={
            can(school, 'school.settings.manage') ? (
              <Button asChild variant="outline">
                <Link from="/$school" to="/$school/parametres">
                  {t('classes.goToYears')}
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <QueryState query={query} skeleton={<ClassesSkeleton />}>
          {(classrooms) =>
            classrooms.length === 0 ? (
              <EmptyState
                title={t('classes.emptyTitle')}
                description={t('classes.emptyDescription')}
              />
            ) : (
              <div className="grid gap-8">
                {byLevel(classrooms).map(({ level, classrooms: group }) => (
                  <section
                    key={level.id}
                    aria-labelledby={`level-${level.id}`}
                    className="grid gap-3"
                  >
                    <h2
                      id={`level-${level.id}`}
                      className="flex flex-wrap items-center gap-3 font-display text-lg font-semibold"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'h-6 w-1.5 rounded-full',
                          CYCLE_CLASSES[cycleTone(level.cycle_code)].dot,
                        )}
                      />
                      {level.name}
                      <CycleBadge
                        code={level.cycle_code}
                        label={t(`cycles.${cycleTone(level.cycle_code)}`)}
                      />
                    </h2>
                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {group.map((classroom) => (
                        <li
                          key={classroom.id}
                          className={cn(
                            'grid gap-3 rounded-2xl border-l-4 bg-card p-5 shadow-soft',
                            CYCLE_CLASSES[cycleTone(level.cycle_code)].border,
                          )}
                        >
                          <h3 className="font-display text-2xl font-bold">{classroom.name}</h3>
                          <dl className="grid gap-1.5 text-sm">
                            <div className="flex items-center gap-2">
                              <dt className="sr-only">{t('classes.sheet.teacher')}</dt>
                              <UserRound aria-hidden className="size-4 text-muted-foreground" />
                              <dd>{classroom.homeroom_teacher?.name ?? t('classes.noTeacher')}</dd>
                            </div>
                            <div className="flex items-center gap-2">
                              <dt className="sr-only">{t('classes.sheet.room')}</dt>
                              <DoorOpen aria-hidden className="size-4 text-muted-foreground" />
                              <dd>{classroom.room ?? t('classes.noRoom')}</dd>
                            </div>
                            <div className="flex items-center gap-2">
                              <dt className="sr-only">{t('classes.sheet.capacity')}</dt>
                              <Users aria-hidden className="size-4 text-muted-foreground" />
                              <dd>
                                {classroom.capacity === null
                                  ? t('classes.noCapacity')
                                  : t('classes.capacity', { count: classroom.capacity })}
                              </dd>
                            </div>
                          </dl>
                          {classroom.can_manage && (
                            <div className="flex flex-wrap gap-2 border-t pt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                aria-label={t('classes.editOf', { name: classroom.name })}
                                onClick={() => {
                                  setEditing(classroom)
                                }}
                              >
                                <Pencil aria-hidden />
                                {t('classes.edit')}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive-ink"
                                aria-label={t('classes.deleteOf', { name: classroom.name })}
                                onClick={() => {
                                  setToDelete(classroom)
                                }}
                              >
                                <Trash2 aria-hidden />
                                {t('classes.delete')}
                              </Button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )
          }
        </QueryState>
      )}

      <Sheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      >
        <SheetContent
          side="right"
          closeLabel={t('common.close')}
          className="w-full max-w-xl gap-0 sm:w-[32rem]"
        >
          {editing !== null && cycles.data !== undefined && (
            <ClassroomSheet
              classroom={editing === 'new' ? null : editing}
              cycles={cycles.data}
              manageableCycleIds={manageScope === undefined ? [] : manageScope}
              teachers={teacherOptions(editing === 'new' ? null : editing)}
              onDone={() => {
                setEditing(null)
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
      >
        <DialogContent closeLabel={t('common.close')}>
          <DialogTitle>
            {toDelete !== null && t('classes.deleteDialog.title', { name: toDelete.name })}
          </DialogTitle>
          <DialogDescription>{t('classes.deleteDialog.description')}</DialogDescription>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => void confirmDelete()}
            >
              <Trash2 aria-hidden />
              {t('classes.deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
