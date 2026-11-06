import { Pencil } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatAverage, formatDayMonth } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useSaveGrades, type Assessment, type GradeGrid } from '../api'
import { formatCell, parseCell, subjectAverage } from '../gradeInput'

const MOVES: Record<string, [number, number]> = {
  ArrowDown: [1, 0],
  Enter: [1, 0],
  ArrowUp: [-1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

/**
 * Grille de saisie au clavier : flèches pour se déplacer, Entrée pour descendre, « abs » pour une absence ;
 * chaque cellule est enregistrée à la sortie (dans la file locale hors connexion). Une note invalide reste affichée
 * en erreur et n'est pas enregistrée.
 */
export function GradeGridEditor({
  grid,
  onEdit,
}: {
  grid: GradeGrid
  onEdit: (assessment: Assessment) => void
}) {
  const { t } = useTranslation()
  const save = useSaveGrades()
  const table = useRef<HTMLTableElement>(null)
  const editable = grid.can_manage
  const scale = grid.grade_scale
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      grid.rows.flatMap((row) =>
        row.grades.map((cell) => [`${row.student.id}|${cell.assessment_id}`, formatCell(cell)]),
      ),
    ),
  )

  const focusCell = (row: number, col: number) => {
    const input = table.current?.querySelector<HTMLInputElement>(
      `input[data-row="${String(row)}"][data-col="${String(col)}"]`,
    )
    input?.focus()
    input?.select()
  }

  const commit = (studentId: string, assessment: Assessment) => {
    const parsed = parseCell(texts[`${studentId}|${assessment.id}`] ?? '', assessment.out_of)
    const current = grid.rows
      .find((row) => row.student.id === studentId)
      ?.grades.find((cell) => cell.assessment_id === assessment.id)
    if (
      !editable ||
      parsed === undefined ||
      current === undefined ||
      (current.value === parsed.value && current.absent === parsed.absent)
    )
      return
    save.mutate({ assessment, grades: [{ student_id: studentId, ...parsed }] })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    const move = MOVES[event.key]
    if (move === undefined) return
    event.preventDefault()
    focusCell(row + move[0], col + move[1])
  }

  return (
    <div className="grid gap-2">
      <p className="h-5 text-right text-xs text-muted-foreground" aria-live="polite">
        {save.isPending
          ? t('grades.saving')
          : save.isError
            ? t('grades.saveFailed')
            : save.data?.queued === true
              ? t('grades.queued')
              : save.isSuccess
                ? t('grades.saved')
                : ''}
      </p>
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <Table ref={table}>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 min-w-48 bg-card">
                {t('grades.student')}
              </TableHead>
              {grid.assessments.map((assessment) => (
                <TableHead key={assessment.id} className="min-w-28 text-center">
                  <span className="grid justify-items-center">
                    <span className="inline-flex items-center gap-1">
                      {assessment.title}
                      {editable && (
                        <button
                          type="button"
                          className="inline-grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                          aria-label={t('grades.editAssessment', { title: assessment.title })}
                          onClick={() => {
                            onEdit(assessment)
                          }}
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </button>
                      )}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {formatDayMonth(assessment.date)} ·{' '}
                      {t('grades.outOf', { count: assessment.out_of })}
                    </span>
                  </span>
                </TableHead>
              ))}
              <TableHead className="text-right">
                {t('grades.averageOutOf', { count: scale })}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grid.rows.map((row, rowIndex) => {
              const live = subjectAverage(
                grid.assessments.map((assessment) => {
                  const parsed = parseCell(
                    texts[`${row.student.id}|${assessment.id}`] ?? '',
                    assessment.out_of,
                  )
                  return {
                    value: parsed?.value ?? null,
                    absent: parsed?.absent ?? false,
                    outOf: assessment.out_of,
                  }
                }),
                scale,
              )
              return (
                <TableRow key={row.student.id}>
                  <TableCell className="sticky left-0 z-10 bg-card font-medium">
                    <span className="flex items-center gap-2">
                      <Avatar
                        name={row.student.full_name}
                        photoUrl={row.student.photo_url}
                        size="sm"
                      />
                      {row.student.full_name}
                    </span>
                  </TableCell>
                  {grid.assessments.map((assessment, colIndex) => {
                    const key = `${row.student.id}|${assessment.id}`
                    const text = texts[key] ?? ''
                    const invalid = parseCell(text, assessment.out_of) === undefined
                    return (
                      <TableCell key={assessment.id} className="p-1.5 text-center">
                        <Input
                          data-row={rowIndex}
                          data-col={colIndex}
                          inputMode="decimal"
                          readOnly={!editable}
                          aria-label={t('grades.cell', {
                            student: row.student.full_name,
                            assessment: assessment.title,
                          })}
                          aria-invalid={invalid}
                          title={
                            invalid ? t('grades.invalid', { max: assessment.out_of }) : undefined
                          }
                          className={cn(
                            'mx-auto h-10 w-20 text-center font-semibold tabular',
                            invalid && 'bg-destructive-soft',
                          )}
                          value={text}
                          onFocus={(event) => {
                            event.target.select()
                          }}
                          onChange={(event) => {
                            setTexts((previous) => ({ ...previous, [key]: event.target.value }))
                          }}
                          onBlur={() => {
                            commit(row.student.id, assessment)
                          }}
                          onKeyDown={(event) => {
                            onKeyDown(event, rowIndex, colIndex)
                          }}
                        />
                      </TableCell>
                    )
                  })}
                  <TableCell
                    className={cn(
                      'text-right font-display font-bold tabular',
                      live !== null && live < scale / 2 && 'text-destructive-ink',
                    )}
                  >
                    {formatAverage(live)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
