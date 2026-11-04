import { Eye, Printer } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton, QueryState } from '@/components/states/QueryState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { termCount } from '@/features/cycles/useCycleSettings'

import { useReportCard, useReportStatus } from '../api'
import { usePedagogyClasses } from '@/features/cycles/usePedagogyClasses'

import { ClassPicker, TermPicker } from '@/components/ClassPicker'
import { ReportDocument } from './ReportDocument'

function Preview({
  studentId,
  term,
  kind,
  termLabel,
}: {
  studentId: string
  term: number
  kind: 'report_card' | 'skills_booklet'
  termLabel: string
}) {
  const query = useReportCard(studentId, term, kind)
  return (
    <QueryState query={query}>
      {(data) => (data === null ? null : <ReportDocument data={data} termLabel={termLabel} />)}
    </QueryState>
  )
}

/** Bulletins (moyenne pondérée) et livrets (compétences) : document choisi d'après les paramètres du cycle. */
export function ReportCardsPage() {
  const { t } = useTranslation()
  const { classrooms, settingsOf, loading } = usePedagogyClasses(
    'grades.view',
    (settings) => settings.report_document !== 'none',
  )
  const [classroomId, setClassroomId] = useState('')
  const [term, setTerm] = useState(1)
  const [preview, setPreview] = useState<{ id: string; name: string } | null>(null)
  const classroom = classrooms.find((candidate) => candidate.id === classroomId) ?? classrooms[0]
  const settings = settingsOf(classroom)
  const kind = settings?.report_document === 'skills_booklet' ? 'skills_booklet' : 'report_card'
  const termType = settings?.term_type ?? 'trimester'
  const termLabel = t('reportCards.term', { type: t(`grades.termTypes.${termType}`), number: term })
  const status = useReportStatus(classroom?.id ?? '', term, kind)

  return (
    <div className="grid gap-6">
      <ScreenHeader title={t('reportCards.title')} description={t('reportCards.description')} />
      {loading ? (
        <ListSkeleton />
      ) : classroom === undefined ? (
        <EmptyState title={t('reportCards.observation')} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="secondary">
              {t(kind === 'report_card' ? 'reportCards.reportCard' : 'reportCards.skillsBooklet')}
            </Badge>
            <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
              <ClassPicker classrooms={classrooms} value={classroom.id} onChange={setClassroomId} />
              <TermPicker
                count={termCount(settings)}
                type={termType}
                value={term}
                onChange={setTerm}
              />
            </div>
          </div>
          <QueryState query={status}>
            {(rows) => (
              <Card className="overflow-hidden p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('grades.student')}</TableHead>
                      <TableHead>{t('reportCards.status')}</TableHead>
                      <TableHead className="text-right">
                        <span className="sr-only">{t('common.actions')}</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.student.id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>
                          <Badge variant={row.complete ? 'success' : 'accent'}>
                            {t(row.complete ? 'reportCards.complete' : 'reportCards.incomplete')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={t('reportCards.previewOf', { name: row.name })}
                            onClick={() => {
                              setPreview({ id: row.student.id, name: row.name })
                            }}
                          >
                            <Eye aria-hidden />
                            {t('reportCards.preview')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </QueryState>
        </>
      )}
      <Dialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      >
        <DialogContent
          closeLabel={t('common.close')}
          className="max-h-[92dvh] max-w-4xl overflow-y-auto bg-[#e8e1d6] p-3 sm:p-6 print:max-h-none print:overflow-visible print:bg-white print:p-0"
        >
          <div className="flex items-center justify-between gap-3 pr-10 print:hidden">
            <DialogTitle>
              {preview === null ? '' : t('reportCards.previewOf', { name: preview.name })}
            </DialogTitle>
            <Button
              variant="accent"
              size="sm"
              onClick={() => {
                window.print()
              }}
            >
              <Printer aria-hidden />
              {t('reportCards.print')}
            </Button>
          </div>
          {preview !== null && (
            <Preview studentId={preview.id} term={term} kind={kind} termLabel={termLabel} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
