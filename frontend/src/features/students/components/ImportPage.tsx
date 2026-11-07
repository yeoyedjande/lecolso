import { Link } from '@tanstack/react-router'
import { CheckCircle2, FileSpreadsheet, RotateCcw, Upload } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

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
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

import {
  ImportSchoolChanged,
  useCheckImport,
  useImportStudents,
  type ImportRowResult,
} from '../api'
import { IMPORT_COLUMNS, IMPORT_ERRORS, parseImport, type ImportResult } from '../import'

/** Lignes envoyées au plus par fichier (limite de l'API). */
const MAX_ROWS = 500

function ErrorBadges({ codes }: { codes: readonly string[] }) {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-wrap gap-1">
      {codes.map((code) => {
        const known = IMPORT_ERRORS.find((candidate) => candidate === code)
        return (
          <li key={code}>
            <Badge variant="destructive">
              {known === undefined ? code : t(`import.errors.${known}`)}
            </Badge>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Import Excel (vraie API) : le fichier est lu dans le navigateur, puis l'API vérifie chaque ligne (classe, places,
 * doublons, élèves déjà inscrits) sans rien écrire ; l'inscription des lignes prêtes se fait ensuite par lots.
 */
export function ImportPage() {
  const { t } = useTranslation()
  const inputId = useId()
  const check = useCheckImport()
  const importStudents = useImportStudents()
  const [result, setResult] = useState<ImportResult | null>(null)
  const [checked, setChecked] = useState<Map<number, ImportRowResult>>(new Map())
  const [fileName, setFileName] = useState('')
  const [reading, setReading] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [onlyErrors, setOnlyErrors] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [imported, setImported] = useState<ImportRowResult[] | null>(null)

  const reset = () => {
    setResult(null)
    setChecked(new Map())
    setImported(null)
    setProgress(null)
    setFailure(null)
  }

  const onFile = async (file: File | undefined) => {
    if (file === undefined) return
    reset()
    setReading(true)
    setFileName(file.name)
    try {
      // Bibliothèque chargée à la demande, seulement sur cet écran
      const { readSheet } = await import('read-excel-file/browser')
      const parsed = parseImport(await readSheet(file))
      setResult(parsed)
      if (parsed.missingColumns.length > 0 || parsed.rows.length === 0) return
      if (parsed.rows.length > MAX_ROWS) {
        setFailure(t('import.tooMany', { count: parsed.rows.length, max: MAX_ROWS }))
        return
      }
      const verdict = await check.mutateAsync(parsed.rows.map((row) => row.body))
      setChecked(new Map(verdict.rows.map((row) => [row.line, row])))
    } catch {
      setResult(null)
      setFailure(t('import.unreadable'))
    } finally {
      setReading(false)
    }
  }

  const rows = result?.rows ?? []
  const ready = rows.filter((row) => checked.get(row.line)?.status === 'ready')
  const skipped = rows.filter((row) => checked.get(row.line)?.status === 'skipped')
  const invalid = rows.filter((row) => checked.get(row.line)?.status === 'error')
  const shown = (onlyErrors ? invalid : rows).slice(0, 200)
  const created = imported?.filter((row) => row.status === 'created').length ?? 0
  const failedAfter = imported?.filter((row) => row.status === 'error') ?? []

  return (
    <div className="grid gap-6">
      <ScreenHeader title={t('import.title')} description={t('import.description')} demo={false} />

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
        <div className="grid gap-4">
          <EmptyState
            title={
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 aria-hidden className="size-5 text-success-ink" />
                {t('import.success', { count: created })}
              </span>
            }
            description={
              failedAfter.length > 0
                ? t('import.failedAfter', { count: failedAfter.length })
                : undefined
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link from="/$school" to="/$school/eleves">
                    {t('students.title')}
                  </Link>
                </Button>
                <Button variant="outline" onClick={reset}>
                  <RotateCcw aria-hidden />
                  {t('import.reset')}
                </Button>
              </div>
            }
          />
          {failedAfter.length > 0 && (
            <ul className="grid gap-2" aria-label={t('import.failedList')}>
              {failedAfter.map((row) => (
                <li key={row.line} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{t('import.lineNumber', { line: row.line })}</span>
                  <ErrorBadges codes={row.errors} />
                </li>
              ))}
            </ul>
          )}
        </div>
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
            disabled={reading || importStudents.isPending}
            onChange={(event) => {
              void onFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </label>
      )}

      {failure !== null && (
        <p
          role="alert"
          className="rounded-xl bg-destructive-soft px-4 py-3 text-sm font-medium text-destructive-ink"
        >
          {failure}
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

      {result !== null && imported === null && checked.size > 0 && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold" aria-live="polite">
              {t('import.summary', { valid: ready.length, invalid: invalid.length })}
              {skipped.length > 0 && ` · ${t('import.skippedCount', { count: skipped.length })}`}
            </p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="only-errors"
                checked={onlyErrors}
                onCheckedChange={(value) => {
                  setOnlyErrors(value === true)
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
                  const verdict = checked.get(row.line)
                  return (
                    <TableRow
                      key={row.line}
                      className={cn(verdict?.status === 'error' && 'bg-destructive-soft/40')}
                    >
                      <TableCell className="tabular">{row.line}</TableCell>
                      <TableCell className="font-medium">
                        {row.values.Nom} {row.values['Prénom']}
                      </TableCell>
                      <TableCell>{row.values.Classe}</TableCell>
                      <TableCell>
                        {verdict?.status === 'ready' ? (
                          <Badge variant="success">{t('import.ok')}</Badge>
                        ) : verdict?.status === 'skipped' ? (
                          <Badge variant="secondary">{t('import.skipped')}</Badge>
                        ) : (
                          <ErrorBadges codes={verdict?.errors ?? []} />
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
            disabled={ready.length === 0 || importStudents.isPending}
            onClick={() => {
              setProgress(0)
              importStudents
                .mutateAsync({ rows: ready.map((row) => row.body), onProgress: setProgress })
                .then((results) => {
                  setImported(results)
                  const count = results.filter((row) => row.status === 'created').length
                  toast(t('import.success', { count }), { tone: 'success' })
                })
                .catch((error: unknown) => {
                  setFailure(
                    error instanceof ImportSchoolChanged
                      ? t('import.schoolChanged')
                      : t('import.interrupted'),
                  )
                })
                .finally(() => {
                  setProgress(null)
                })
            }}
          >
            {importStudents.isPending
              ? t('import.progress', { done: progress ?? 0, total: ready.length })
              : t('import.submit', { count: ready.length })}
          </Button>
        </div>
      )}
    </div>
  )
}
