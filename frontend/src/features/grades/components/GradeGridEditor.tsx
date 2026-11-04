import { useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

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

import { useSaveGrade } from '../api'
import { average, type GradeGrid } from '../demo'
import { formatGrade, parseGrade } from '../gradeInput'

const MOVES: Record<string, [number, number]> = {
  ArrowDown: [1, 0],
  Enter: [1, 0],
  ArrowUp: [-1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

/**
 * Grille de saisie au clavier : flèches pour se déplacer, Entrée pour descendre, enregistrement de chaque
 * cellule à la sortie. Une note invalide reste affichée en erreur et n'est pas enregistrée.
 */
export function GradeGridEditor({ grid, editable }: { grid: GradeGrid; editable: boolean }) {
  const { t } = useTranslation()
  const save = useSaveGrade()
  const table = useRef<HTMLTableElement>(null)
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      grid.rows.flatMap((row) =>
        grid.assessments.map((a) => [
          `${row.student.id}|${a.id}`,
          formatGrade(row.values[a.id] ?? null),
        ]),
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

  const commit = (studentId: string, assessmentId: string) => {
    const key = `${studentId}|${assessmentId}`
    const value = parseGrade(texts[key] ?? '')
    const row = grid.rows.find((candidate) => candidate.student.id === studentId)
    // Lecture seule sans grades.manage (le backend refusera aussi l'écriture)
    if (
      !editable ||
      value === undefined ||
      row === undefined ||
      (row.values[assessmentId] ?? null) === value
    )
      return
    save.mutate({ assessmentId, studentId, value })
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
        {save.isPending ? t('grades.saving') : save.isSuccess ? t('grades.saved') : ''}
      </p>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <Table ref={table}>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 min-w-48 bg-card">
                {t('grades.student')}
              </TableHead>
              {grid.assessments.map((assessment) => (
                <TableHead key={assessment.id} className="min-w-28 text-center">
                  <span className="grid">
                    <span>{assessment.title}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {formatDayMonth(assessment.date)} ·{' '}
                      {t('grades.outOf', { count: assessment.outOf })}
                    </span>
                  </span>
                </TableHead>
              ))}
              <TableHead className="text-right">{t('grades.average')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grid.rows.map((row, rowIndex) => {
              const live = average(
                grid.assessments.map(
                  (a) => parseGrade(texts[`${row.student.id}|${a.id}`] ?? '') ?? null,
                ),
              )
              return (
                <TableRow key={row.student.id}>
                  <TableCell className="sticky left-0 z-10 bg-card font-medium">
                    {row.name}
                  </TableCell>
                  {grid.assessments.map((assessment, colIndex) => {
                    const key = `${row.student.id}|${assessment.id}`
                    const text = texts[key] ?? ''
                    const invalid = parseGrade(text) === undefined
                    return (
                      <TableCell key={assessment.id} className="p-1.5 text-center">
                        <Input
                          data-row={rowIndex}
                          data-col={colIndex}
                          inputMode="decimal"
                          readOnly={!editable}
                          aria-label={t('grades.cell', {
                            student: row.name,
                            assessment: assessment.title,
                          })}
                          aria-invalid={invalid}
                          title={invalid ? t('grades.invalid') : undefined}
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
                            commit(row.student.id, assessment.id)
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
                      live !== null && live < 10 && 'text-destructive-ink',
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
