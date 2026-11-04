import { Link } from '@tanstack/react-router'
import { CheckCircle2, FileSpreadsheet, RotateCcw, Upload } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CycleBadge } from '@/components/CycleBadge'
import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useClassroomOptions } from '@/features/classes/api'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

import { useImportStudents } from '../api'
import { IMPORT_COLUMNS, parseImport, type ImportResult } from '../import'

/** Import Excel : lecture locale du fichier (aucun envoi avant validation), aperçu, erreurs ligne par ligne. */
export function ImportPage() {
  const { t } = useTranslation()
  const inputId = useId()
  const classrooms = useClassroomOptions()
  const importStudents = useImportStudents()
  const [result, setResult] = useState<ImportResult | null>(null)
  const [fileName, setFileName] = useState('')
  const [reading, setReading] = useState(false)
  const [unreadable, setUnreadable] = useState(false)
  const [onlyErrors, setOnlyErrors] = useState(false)
  const [imported, setImported] = useState<number | null>(null)

  const onFile = async (file: File | undefined) => {
    if (file === undefined) return
    setReading(true)
    setUnreadable(false)
    setImported(null)
    setFileName(file.name)
    try {
      // Bibliothèque chargée à la demande, seulement sur cet écran
      const { readSheet } = await import('read-excel-file/browser')
      const sheet = await readSheet(file)
      setResult(parseImport(sheet, classrooms.data ?? []))
    } catch {
      setResult(null)
      setUnreadable(true)
    } finally {
      setReading(false)
    }
  }

  const valid = result?.rows.filter((row) => row.input !== null) ?? []
  const invalid = result?.rows.filter((row) => row.input === null) ?? []
  const shown = (onlyErrors ? invalid : (result?.rows ?? [])).slice(0, 200)

  return (
    <div className="grid gap-6">
      <ScreenHeader title={t('import.title')} description={t('import.description')} />

      <Card>
        <CardHeader>
          <CardTitle>{t('import.columnsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <ul className="flex flex-wrap gap-2">
            {IMPORT_COLUMNS.map((column) => (
              <li key={column}>
                <Badge variant="secondary">{column}</Badge>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">{t('import.columnsHint')}</p>
        </CardContent>
      </Card>

      {imported !== null ? (
        <EmptyState
          title={
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 aria-hidden className="size-5 text-success-ink" />
              {t('import.success', { count: imported })}
            </span>
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/gestion/eleves">{t('students.title')}</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setImported(null)
                  setResult(null)
                }}
              >
                <RotateCcw aria-hidden />
                {t('import.reset')}
              </Button>
            </div>
          }
        />
      ) : (
        <label
          htmlFor={inputId}
          className="flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed bg-card/60 px-6 py-10 text-center transition hover:border-accent focus-within:border-accent"
        >
          <span className="grid size-14 place-items-center rounded-2xl bg-success-soft text-success-ink">
            <FileSpreadsheet aria-hidden className="size-7" />
          </span>
          <span className="inline-flex items-center gap-2 font-semibold">
            <Upload aria-hidden className="size-4" />
            {reading ? t('import.reading') : fileName === '' ? t('import.choose') : fileName}
          </span>
          <span className="text-sm text-muted-foreground">{t('import.dropHint')}</span>
          <input
            id={inputId}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(event) => {
              void onFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </label>
      )}

      {unreadable && (
        <p
          role="alert"
          className="rounded-xl bg-destructive-soft px-4 py-3 text-sm font-medium text-destructive-ink"
        >
          {t('import.unreadable')}
        </p>
      )}

      {result !== null && imported === null && result.missingColumns.length > 0 && (
        <p
          role="alert"
          className="rounded-xl bg-destructive-soft px-4 py-3 text-sm font-medium text-destructive-ink"
        >
          {t('import.missingColumns', { columns: result.missingColumns.join(', ') })}
        </p>
      )}

      {result !== null && imported === null && result.rows.length > 0 && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold" aria-live="polite">
              {t('import.summary', { valid: valid.length, invalid: invalid.length })}
            </p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="only-errors"
                checked={onlyErrors}
                onCheckedChange={(checked) => {
                  setOnlyErrors(checked === true)
                }}
              />
              <Label htmlFor="only-errors">{t('import.onlyErrors')}</Label>
            </div>
          </div>
          <Card className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('import.line')}</TableHead>
                  <TableHead>{t('students.student')}</TableHead>
                  <TableHead>{t('students.classroom')}</TableHead>
                  <TableHead>{t('import.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((row) => {
                  const classroom = (classrooms.data ?? []).find(
                    (c) => c.id === row.input?.classroomId,
                  )
                  return (
                    <TableRow
                      key={row.line}
                      className={cn(row.input === null && 'bg-destructive-soft/40')}
                    >
                      <TableCell className="tabular">{row.line}</TableCell>
                      <TableCell className="font-medium">
                        {row.values.Nom} {row.values['Prénom']}
                      </TableCell>
                      <TableCell>
                        {classroom !== undefined ? (
                          <CycleBadge code={classroom.cycle} label={classroom.name} />
                        ) : (
                          row.values.Classe
                        )}
                      </TableCell>
                      <TableCell>
                        {row.input !== null ? (
                          <Badge variant="success">{t('import.ok')}</Badge>
                        ) : (
                          <ul className="flex flex-wrap gap-1">
                            {row.errors.map((error) => (
                              <li key={error}>
                                <Badge variant="destructive">{t(`import.errors.${error}`)}</Badge>
                              </li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
          <Button
            variant="accent"
            size="lg"
            className="justify-self-end"
            disabled={valid.length === 0 || importStudents.isPending}
            onClick={() => {
              const inputs = valid.flatMap((row) => (row.input === null ? [] : [row.input]))
              void importStudents.mutateAsync(inputs).then((count) => {
                setImported(count)
                toast(t('import.success', { count }), { tone: 'success' })
              })
            }}
          >
            {t(importStudents.isPending ? 'import.submitting' : 'import.submit', {
              count: valid.length,
            })}
          </Button>
        </div>
      )}
    </div>
  )
}
