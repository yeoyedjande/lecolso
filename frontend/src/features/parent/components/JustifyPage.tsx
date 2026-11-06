import { useNavigate } from '@tanstack/react-router'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/states/EmptyState'
import { ListSkeleton, QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { ConflictError, ValidationError } from '@/lib/api/errors'
import { formatDate } from '@/lib/format'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

import { useChild, useJustifyAbsence, useMyChildren } from '../api'

/**
 * Justification d'une absence relevée par l'école : l'enfant, l'absence, le motif et une photo facultative du
 * certificat ; l'école accepte ou refuse. Trois écrans au plus depuis l'accueil.
 */
export function JustifyPage({
  studentId,
  markId,
}: {
  studentId: string | undefined
  markId: string | undefined
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const children = useMyChildren()
  const [childId, setChildId] = useState(studentId ?? '')
  const current = childId === '' ? (children.data?.[0]?.student.id ?? '') : childId
  const child = useChild(current)
  const justify = useJustifyAbsence()
  const [chosen, setChosen] = useState(markId ?? '')
  const [reason, setReason] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="font-display text-2xl font-bold">{t('parent.justify.title')}</h1>
        <p className="text-muted-foreground">{t('parent.justify.subtitle')}</p>
      </div>
      {children.isPending ? (
        <ListSkeleton />
      ) : (children.data ?? []).length === 0 ? (
        <EmptyState title={t('parent.home.noChild')} />
      ) : (
        <>
          {(children.data ?? []).length > 1 && (
            <Field label={t('parent.justify.child')}>
              {(control) => (
                <NativeSelect
                  {...control}
                  value={current}
                  onChange={(event) => {
                    setChildId(event.target.value)
                    setChosen('')
                  }}
                >
                  {(children.data ?? []).map((candidate) => (
                    <option key={candidate.student.id} value={candidate.student.id}>
                      {candidate.student.full_name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
          )}
          <QueryState query={child}>
            {(data) => {
              const open = (data?.absences ?? []).filter((mark) => mark.can_justify)
              const selected = open.find((mark) => mark.id === chosen) ?? open[0]
              return open.length === 0 || data === null ? (
                <EmptyState title={t('parent.justify.none')} />
              ) : (
                <form
                  className="grid gap-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (selected === undefined) return
                    setError(null)
                    justify
                      .mutateAsync({ markId: selected.id, reason: reason.trim(), proof })
                      .then(() => {
                        toast(t('parent.justify.sent'), { tone: 'success' })
                        void navigate({
                          from: '/$school',
                          to: '/$school/parent/enfants/$studentId',
                          params: { studentId: data.student.id },
                          search: { onglet: 'absences' },
                        })
                      })
                      .catch((caught: unknown) => {
                        setError(
                          caught instanceof ConflictError
                            ? caught.message
                            : caught instanceof ValidationError
                              ? (Object.values(caught.fields)[0]?.[0] ?? t('common.error'))
                              : t('common.error'),
                        )
                      })
                  }}
                >
                  <fieldset className="grid gap-2">
                    <legend className="mb-1 text-sm font-medium">
                      {t('parent.justify.absence')}
                    </legend>
                    {open.map((mark) => (
                      <label
                        key={mark.id}
                        className={cn(
                          'flex min-h-12 items-center gap-3 rounded-xl border bg-card px-3 text-sm',
                          selected?.id === mark.id && 'border-accent ring-2 ring-accent/20',
                        )}
                      >
                        <input
                          type="radio"
                          name="absence"
                          className="size-4 accent-[var(--color-accent)]"
                          checked={selected?.id === mark.id}
                          onChange={() => {
                            setChosen(mark.id)
                          }}
                        />
                        <span className="first-letter:uppercase">{formatDate(mark.date)}</span>
                        {mark.justification?.status === 'refused' && (
                          <span className="text-xs text-destructive-ink">
                            {t('parent.justify.refusedBefore')}
                          </span>
                        )}
                      </label>
                    ))}
                  </fieldset>
                  <Field label={t('parent.justify.reason')}>
                    {(control) => (
                      <Textarea
                        {...control}
                        rows={3}
                        required
                        minLength={3}
                        maxLength={300}
                        placeholder={t('parent.justify.reasonPlaceholder')}
                        value={reason}
                        onChange={(event) => {
                          setReason(event.target.value)
                        }}
                      />
                    )}
                  </Field>
                  <Field label={t('parent.justify.proof')} hint={t('parent.justify.proofHint')}>
                    {(control) => (
                      <Input
                        {...control}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          setProof(event.target.files?.[0] ?? null)
                        }}
                      />
                    )}
                  </Field>
                  {error !== null && (
                    <p className="text-sm text-destructive-ink" role="alert">
                      {error}
                    </p>
                  )}
                  <Button
                    type="submit"
                    size="lg"
                    variant="accent"
                    disabled={justify.isPending || reason.trim().length < 3}
                  >
                    <Send aria-hidden />
                    {t('parent.justify.submit')}
                  </Button>
                </form>
              )
            }}
          </QueryState>
        </>
      )}
    </div>
  )
}
