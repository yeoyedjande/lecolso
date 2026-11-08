import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRightLeft,
  HeartPulse,
  LogOut,
  Pencil,
  Phone,
  RotateCcw,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { can } from '@/features/auth/access'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { InvoicePanel } from '@/features/billing/components/InvoicePanel'
import { ConflictError } from '@/lib/api/errors'
import { formatDay, formatPhone } from '@/lib/format'
import { toast } from '@/lib/toast'

import { ageOf } from '../age'
import {
  useDeleteStudent,
  useRemoveGuardian,
  useStudentFile,
  type StudentFile,
  type StudentGuardian,
} from '../api'
import { EnrollmentDialog, type EnrollmentAction } from './EnrollmentDialog'
import { PhotoControl } from './PhotoControl'
import { GuardianSheet, StudentEditSheet } from './StudentSheets'

function Info({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}

type Panel =
  | { kind: 'edit' }
  | { kind: 'guardian'; guardian: StudentGuardian | null }
  | { kind: 'enrollment'; action: EnrollmentAction }
  | { kind: 'removeGuardian'; guardian: StudentGuardian }
  | { kind: 'delete' }

const REMOVE_CONFLICTS = ['last_guardian', 'reassign_first'] as const

function Detail({ file }: { file: StudentFile }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [panel, setPanel] = useState<Panel | null>(null)
  const removeGuardian = useRemoveGuardian(file.id)
  const deleteStudent = useDeleteStudent()
  const enrollment = file.enrollments[0]
  const today = new Date().toISOString().slice(0, 10)
  const editable = enrollment?.academic_year.status !== 'closed'
  const school = useCurrentSchool()
  const tabs = can(school, 'billing.view')
    ? (['identity', 'guardians', 'schooling', 'fees'] as const)
    : (['identity', 'guardians', 'schooling'] as const)
  const close = () => {
    setPanel(null)
  }

  const confirmRemove = async (guardian: StudentGuardian) => {
    try {
      await removeGuardian.mutateAsync(guardian.id)
      toast(t('students.guardians.removed', { name: guardian.name }), { tone: 'success' })
    } catch (error) {
      const code =
        error instanceof ConflictError
          ? REMOVE_CONFLICTS.find((candidate) => candidate === error.code)
          : undefined
      toast(code === undefined ? t('common.error') : t(`students.guardians.conflicts.${code}`), {
        tone: 'error',
      })
    } finally {
      close()
    }
  }

  const confirmDelete = async () => {
    try {
      await deleteStudent.mutateAsync(file.id)
      toast(t('students.detail.deleted', { name: file.full_name }), { tone: 'success' })
      void navigate({ from: '/$school', to: '/$school/eleves' })
    } catch {
      toast(t('common.error'), { tone: 'error' })
      close()
    }
  }

  return (
    <div className="grid gap-6">
      <section className="relative overflow-hidden rounded-3xl border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <PhotoControl
            studentId={file.id}
            guardianId={null}
            name={file.full_name}
            photoUrl={file.photo_url}
            editable={file.can_manage}
            size="xl"
          />
          <div className="grid min-w-0 flex-1 gap-1">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {file.full_name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {enrollment !== undefined && (
                <CycleBadge
                  code={enrollment.classroom.cycle_code}
                  label={enrollment.classroom.name}
                />
              )}
              <span>{file.matricule}</span>
              <span aria-hidden>·</span>
              <span>{t('students.detail.age', { count: ageOf(file.birth_date, today) })}</span>
              {enrollment?.status === 'left' && (
                <Badge variant="outline">{t('students.statuses.left')}</Badge>
              )}
            </div>
          </div>
          {file.can_manage && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPanel({ kind: 'edit' })
                }}
              >
                <Pencil aria-hidden />
                {t('students.detail.edit')}
              </Button>
              <Button
                variant="ghost"
                className="text-destructive-ink"
                onClick={() => {
                  setPanel({ kind: 'delete' })
                }}
              >
                <Trash2 aria-hidden />
                {t('students.detail.delete')}
              </Button>
            </div>
          )}
        </div>
      </section>

      <Tabs defaultValue="identity">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max">
            {tabs.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {t(`students.detail.tabs.${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="identity" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <dl className="grid gap-4 sm:grid-cols-2">
                <Info label={t('students.detail.matricule')}>{file.matricule}</Info>
                <Info label={t('students.detail.born')}>
                  {formatDay(file.birth_date)}
                  {file.birth_place !== null && ` · ${file.birth_place}`}
                </Info>
                <Info label={t('students.detail.gender')}>
                  {t(`students.detail.genders.${file.gender}`)}
                </Info>
                <Info label={t('students.detail.district')}>
                  {file.address ?? t('students.detail.notProvided')}
                </Info>
                {enrollment !== undefined && (
                  <Info label={t('students.detail.enrolledAt')}>
                    {formatDay(enrollment.enrolled_on)}
                  </Info>
                )}
              </dl>
            </CardContent>
          </Card>
          {file.medical !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HeartPulse aria-hidden className="size-5 text-destructive-ink" />
                  {t('students.detail.medical')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Info label={t('enrollment.bloodType')}>
                    {file.medical.blood_type ?? t('students.detail.notProvided')}
                  </Info>
                  <Info label={t('enrollment.allergies')}>
                    {file.medical.allergies ?? t('students.detail.medicalNone')}
                  </Info>
                </dl>
                {file.medical.medical_notes !== null && <p>{file.medical.medical_notes}</p>}
                <p className="text-xs text-muted-foreground">{t('students.detail.medicalHint')}</p>
              </CardContent>
            </Card>
          )}
          {file.siblings.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('students.detail.siblings')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-wrap gap-2">
                  {file.siblings.map((sibling) => (
                    <li key={sibling.id}>
                      <Link
                        from="/$school"
                        to="/$school/eleves/$studentId"
                        params={{ studentId: sibling.id }}
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                      >
                        <Avatar name={sibling.full_name} photoUrl={sibling.photo_url} size="sm" />
                        {sibling.full_name}
                        {sibling.classroom_name !== null && (
                          <span className="text-muted-foreground">{sibling.classroom_name}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="guardians" className="mt-4 grid gap-4">
          {file.can_manage && (
            <Button
              variant="outline"
              className="justify-self-start"
              onClick={() => {
                setPanel({ kind: 'guardian', guardian: null })
              }}
            >
              <UserPlus aria-hidden />
              {t('students.guardians.add')}
            </Button>
          )}
          <ul className="grid gap-4 md:grid-cols-2">
            {file.guardians.map((guardian) => (
              <li key={guardian.id}>
                <Card>
                  <CardContent className="flex items-start gap-4 pt-6">
                    <Avatar name={guardian.name} photoUrl={guardian.photo_url} />
                    <div className="grid min-w-0 flex-1 gap-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {guardian.name}
                        {guardian.is_payer && (
                          <Badge variant="accent">{t('students.detail.payerBadge')}</Badge>
                        )}
                        {guardian.is_primary_contact && (
                          <Badge variant="secondary">{t('students.guardians.primaryBadge')}</Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t(`enrollment.relations.${guardian.relation}`)}
                        {guardian.profession !== null && ` · ${guardian.profession}`}
                      </p>
                      <p className="tabular text-sm">{formatPhone(guardian.phone)}</p>
                      {!guardian.can_pick_up && (
                        <p className="text-sm text-destructive-ink">
                          {t('students.guardians.noPickUp')}
                        </p>
                      )}
                      {file.can_manage && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={t('students.guardians.editOf', { name: guardian.name })}
                            onClick={() => {
                              setPanel({ kind: 'guardian', guardian })
                            }}
                          >
                            <Pencil aria-hidden />
                            {t('students.detail.edit')}
                          </Button>
                          <PhotoControl
                            studentId={file.id}
                            guardianId={guardian.id}
                            name={guardian.name}
                            photoUrl={guardian.photo_url}
                            editable
                            showAvatar={false}
                          />
                          {file.guardians.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive-ink"
                              aria-label={t('students.guardians.removeOf', { name: guardian.name })}
                              onClick={() => {
                                setPanel({ kind: 'removeGuardian', guardian })
                              }}
                            >
                              <Trash2 aria-hidden />
                              {t('students.guardians.remove')}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      asChild
                      variant="outline"
                      size="icon"
                      aria-label={t('students.detail.call', { name: guardian.name })}
                    >
                      <a href={`tel:${guardian.phone}`}>
                        <Phone aria-hidden />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="schooling" className="mt-4 grid gap-4">
          {file.can_manage && enrollment !== undefined && editable && (
            <div className="flex flex-wrap gap-2">
              {enrollment.status === 'active' ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPanel({ kind: 'enrollment', action: 'move' })
                    }}
                  >
                    <ArrowRightLeft aria-hidden />
                    {t('students.schooling.move')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-destructive-ink"
                    onClick={() => {
                      setPanel({ kind: 'enrollment', action: 'leave' })
                    }}
                  >
                    <LogOut aria-hidden />
                    {t('students.schooling.leave')}
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setPanel({ kind: 'enrollment', action: 'return' })
                  }}
                >
                  <RotateCcw aria-hidden />
                  {t('students.schooling.return')}
                </Button>
              )}
            </div>
          )}
          <ul className="grid gap-3">
            {file.enrollments.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="grid gap-3 pt-6 sm:grid-cols-[160px_minmax(0,1fr)]">
                    <p className="font-display text-lg font-bold">{item.academic_year.label}</p>
                    <dl className="grid gap-3 sm:grid-cols-3">
                      <Info label={t('students.classroom')}>
                        <CycleBadge code={item.classroom.cycle_code} label={item.classroom.name} />
                      </Info>
                      <Info label={t('students.detail.teacher')}>
                        {item.classroom.homeroom_teacher ?? t('classes.noTeacher')}
                      </Info>
                      <Info label={t('students.status')}>
                        {item.status === 'left' && item.left_on !== null
                          ? t('students.schooling.leftSince', { date: formatDay(item.left_on) })
                          : t('students.statuses.active')}
                      </Info>
                      {item.leave_reason !== null && (
                        <div className="sm:col-span-3">
                          <Info label={t('students.schooling.reason')}>{item.leave_reason}</Info>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </TabsContent>
        {can(school, 'billing.view') && (
          <TabsContent value="fees" className="mt-4">
            <InvoicePanel studentId={file.id} />
          </TabsContent>
        )}
      </Tabs>

      <Sheet
        open={panel?.kind === 'edit' || panel?.kind === 'guardian'}
        onOpenChange={(open) => {
          if (!open) close()
        }}
      >
        <SheetContent
          side="right"
          closeLabel={t('common.close')}
          className="w-full max-w-xl gap-0 sm:w-[34rem]"
        >
          {panel?.kind === 'edit' && <StudentEditSheet file={file} onDone={close} />}
          {panel?.kind === 'guardian' && (
            <GuardianSheet file={file} guardian={panel.guardian} onDone={close} />
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={
          panel?.kind === 'enrollment' ||
          panel?.kind === 'removeGuardian' ||
          panel?.kind === 'delete'
        }
        onOpenChange={(open) => {
          if (!open) close()
        }}
      >
        <DialogContent closeLabel={t('common.close')}>
          {panel?.kind === 'enrollment' && enrollment !== undefined && (
            <EnrollmentDialog
              file={file}
              enrollment={enrollment}
              action={panel.action}
              onDone={close}
            />
          )}
          {panel?.kind === 'removeGuardian' && (
            <>
              <DialogTitle>
                {t('students.guardians.removeTitle', { name: panel.guardian.name })}
              </DialogTitle>
              <DialogDescription>{t('students.guardians.removeDescription')}</DialogDescription>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">{t('common.cancel')}</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  disabled={removeGuardian.isPending}
                  onClick={() => void confirmRemove(panel.guardian)}
                >
                  <Trash2 aria-hidden />
                  {t('students.guardians.remove')}
                </Button>
              </DialogFooter>
            </>
          )}
          {panel?.kind === 'delete' && (
            <>
              <DialogTitle>
                {t('students.detail.deleteTitle', { name: file.full_name })}
              </DialogTitle>
              <DialogDescription>{t('students.detail.deleteDescription')}</DialogDescription>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">{t('common.cancel')}</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  disabled={deleteStudent.isPending}
                  onClick={() => void confirmDelete()}
                >
                  <Trash2 aria-hidden />
                  {t('students.detail.deleteConfirm')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Dossier d'un élève (vraie API) : identité, données médicales selon les droits, tuteurs, scolarité. */
export function StudentDetailPage({ studentId }: { studentId: string }) {
  const { t } = useTranslation()
  const query = useStudentFile(studentId)

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link from="/$school" to="/$school/eleves">
            <ArrowLeft aria-hidden />
            {t('students.detail.back')}
          </Link>
        </Button>
      </div>
      <QueryState query={query}>
        {(file) =>
          file === null ? (
            <EmptyState
              headingLevel={1}
              illustration="lost"
              title={t('students.detail.notFound')}
            />
          ) : (
            <Detail file={file} />
          )
        }
      </QueryState>
    </div>
  )
}
