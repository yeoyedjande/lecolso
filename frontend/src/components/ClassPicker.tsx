import { useTranslation } from 'react-i18next'

import { NativeSelect } from '@/components/ui/native-select'

/** Sélecteur de classe (et de période) commun aux écrans pédagogiques. */
export function ClassPicker({
  classrooms,
  value,
  onChange,
  label,
}: {
  classrooms: readonly { id: string; name: string }[]
  value: string
  onChange: (id: string) => void
  label?: string
}) {
  const { t } = useTranslation()
  return (
    <NativeSelect
      aria-label={label ?? t('grades.classroom')}
      value={value}
      onChange={(event) => {
        onChange(event.target.value)
      }}
    >
      {classrooms.map((classroom) => (
        <option key={classroom.id} value={classroom.id}>
          {classroom.name}
        </option>
      ))}
    </NativeSelect>
  )
}

export function TermPicker({
  count,
  type,
  value,
  onChange,
}: {
  count: number
  type: 'trimester' | 'semester' | 'free_period'
  value: number
  onChange: (term: number) => void
}) {
  const { t } = useTranslation()
  return (
    <NativeSelect
      aria-label={t('grades.term')}
      value={String(value)}
      onChange={(event) => {
        onChange(Number(event.target.value))
      }}
    >
      {Array.from({ length: count }, (_, index) => (
        <option key={index} value={String(index + 1)}>
          {t('grades.termLabel', { type: t(`grades.termTypes.${type}`), number: index + 1 })}
        </option>
      ))}
    </NativeSelect>
  )
}

/** Période réelle d'une classe (trimestre, semestre ou période libre renvoyés par l'API). */
export function TermSelect({
  terms,
  value,
  onChange,
}: {
  terms: readonly { id: string; label: string }[]
  value: string
  onChange: (termId: string) => void
}) {
  const { t } = useTranslation()
  return (
    <NativeSelect
      aria-label={t('grades.term')}
      value={value}
      onChange={(event) => {
        onChange(event.target.value)
      }}
    >
      {terms.map((term) => (
        <option key={term.id} value={term.id}>
          {term.label}
        </option>
      ))}
    </NativeSelect>
  )
}
