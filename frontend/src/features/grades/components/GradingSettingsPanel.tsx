import { Plus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import type { Cycle } from '@/features/cycles/api'
import { ConflictError, ValidationError } from '@/lib/api/errors'
import { toast } from '@/lib/toast'

import {
  useGradingSettings,
  useSaveMentionThresholds,
  useSaveSkillCatalog,
  useSaveSubjects,
  useSaveTerms,
  type GradingSettings,
} from '../api'

/** Message d'une erreur d'enregistrement : conflit métier, première erreur de validation, ou message générique. */
function failure(error: unknown, fallback: string): string {
  if (error instanceof ConflictError) return error.message
  if (error instanceof ValidationError) return Object.values(error.fields)[0]?.[0] ?? fallback
  return fallback
}

function TermsCard({ settings }: { settings: GradingSettings }) {
  const { t } = useTranslation()
  const save = useSaveTerms()
  const [terms, setTerms] = useState(settings.terms)
  const editable = settings.can_manage
  const change = (index: number, field: 'label' | 'starts_on' | 'ends_on', value: string) => {
    setTerms((previous) =>
      previous.map((term, position) => (position === index ? { ...term, [field]: value } : term)),
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('gradingSettings.terms')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            save
              .mutateAsync({
                cycleId: settings.cycle.id,
                yearId: settings.academic_year.id,
                terms: terms.map(({ label, starts_on, ends_on }) => ({
                  label,
                  starts_on,
                  ends_on,
                })),
              })
              .then(() => {
                toast(t('gradingSettings.saved'), { tone: 'success' })
              })
              .catch((error: unknown) => {
                toast(failure(error, t('gradingSettings.failed')), { tone: 'error' })
              })
          }}
        >
          {terms.map((term, index) => (
            <fieldset key={term.id} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
              <legend className="sr-only">{term.label}</legend>
              <Input
                aria-label={t('gradingSettings.termLabel', { position: index + 1 })}
                disabled={!editable}
                required
                maxLength={60}
                value={term.label}
                onChange={(event) => {
                  change(index, 'label', event.target.value)
                }}
              />
              <Input
                type="date"
                aria-label={t('gradingSettings.termStart', { label: term.label })}
                disabled={!editable}
                required
                value={term.starts_on}
                onChange={(event) => {
                  change(index, 'starts_on', event.target.value)
                }}
              />
              <Input
                type="date"
                aria-label={t('gradingSettings.termEnd', { label: term.label })}
                disabled={!editable}
                required
                value={term.ends_on}
                onChange={(event) => {
                  change(index, 'ends_on', event.target.value)
                }}
              />
            </fieldset>
          ))}
          {editable && (
            <div className="flex justify-end">
              <Button type="submit" disabled={save.isPending}>
                <Save aria-hidden />
                {t('gradingSettings.saveTerms')}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

interface SubjectDraft {
  key: string
  id: string | null
  name: string
  coefficient: string
  used: boolean
}

function SubjectsCard({ settings }: { settings: GradingSettings }) {
  const { t } = useTranslation()
  const save = useSaveSubjects()
  const [levelId, setLevelId] = useState(settings.levels[0]?.id ?? '')
  const level = settings.levels.find((candidate) => candidate.id === levelId) ?? settings.levels[0]
  const initial = (): SubjectDraft[] =>
    (level?.subjects ?? []).map((subject) => ({
      key: subject.id,
      id: subject.id,
      name: subject.name,
      coefficient: String(subject.coefficient),
      used: subject.used,
    }))
  const [drafts, setDrafts] = useState<SubjectDraft[]>(initial)
  const [shownLevel, setShownLevel] = useState(level?.id)
  if (shownLevel !== level?.id) {
    setShownLevel(level?.id)
    setDrafts(initial())
  }
  const editable = settings.can_manage
  if (level === undefined) return null

  const change = (key: string, patch: Partial<SubjectDraft>) => {
    setDrafts((previous) =>
      previous.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)),
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>{t('gradingSettings.subjects')}</CardTitle>
        <NativeSelect
          aria-label={t('gradingSettings.level')}
          className="w-auto"
          value={level.id}
          onChange={(event) => {
            setLevelId(event.target.value)
          }}
        >
          {settings.levels.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </NativeSelect>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            save
              .mutateAsync({
                levelId: level.id,
                yearId: settings.academic_year.id,
                subjects: drafts.map((draft) => ({
                  id: draft.id,
                  name: draft.name.trim(),
                  coefficient: Number(draft.coefficient),
                })),
              })
              .then(() => {
                toast(t('gradingSettings.saved'), { tone: 'success' })
              })
              .catch((error: unknown) => {
                toast(failure(error, t('gradingSettings.failed')), { tone: 'error' })
              })
          }}
        >
          <p className="text-sm text-muted-foreground">{t('gradingSettings.subjectsHint')}</p>
          {drafts.map((draft) => (
            <div key={draft.key} className="grid grid-cols-[1fr_6rem_auto] items-center gap-2">
              <Input
                aria-label={t('gradingSettings.subjectName')}
                disabled={!editable}
                required
                maxLength={80}
                value={draft.name}
                onChange={(event) => {
                  change(draft.key, { name: event.target.value })
                }}
              />
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                aria-label={t('gradingSettings.coefficientOf', { subject: draft.name })}
                disabled={!editable}
                required
                value={draft.coefficient}
                onChange={(event) => {
                  change(draft.key, { coefficient: event.target.value })
                }}
              />
              {editable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={draft.used}
                  title={draft.used ? t('gradingSettings.used') : undefined}
                  aria-label={t('gradingSettings.remove', { name: draft.name })}
                  onClick={() => {
                    setDrafts((previous) => previous.filter((other) => other.key !== draft.key))
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              ) : (
                <span />
              )}
            </div>
          ))}
          {editable && (
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDrafts((previous) => [
                    ...previous,
                    { key: crypto.randomUUID(), id: null, name: '', coefficient: '1', used: false },
                  ])
                }}
              >
                <Plus aria-hidden />
                {t('gradingSettings.addSubject')}
              </Button>
              <Button type="submit" disabled={save.isPending || drafts.length === 0}>
                <Save aria-hidden />
                {t('gradingSettings.saveSubjects', { level: level.name })}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

interface SkillDraft {
  key: string
  id: string | null
  domain: string
  label: string
  used: boolean
}

function SkillsCard({ settings }: { settings: GradingSettings }) {
  const { t } = useTranslation()
  const save = useSaveSkillCatalog()
  const [drafts, setDrafts] = useState<SkillDraft[]>(() =>
    settings.skills.map((skill) => ({ key: skill.id, ...skill })),
  )
  const editable = settings.can_manage
  const change = (key: string, patch: Partial<SkillDraft>) => {
    setDrafts((previous) =>
      previous.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)),
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('gradingSettings.skills')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            save
              .mutateAsync({
                cycleId: settings.cycle.id,
                yearId: settings.academic_year.id,
                skills: drafts.map((draft) => ({
                  id: draft.id,
                  domain: draft.domain.trim(),
                  label: draft.label.trim(),
                })),
              })
              .then(() => {
                toast(t('gradingSettings.saved'), { tone: 'success' })
              })
              .catch((error: unknown) => {
                toast(failure(error, t('gradingSettings.failed')), { tone: 'error' })
              })
          }}
        >
          {drafts.map((draft) => (
            <div key={draft.key} className="grid grid-cols-[1fr_2fr_auto] items-center gap-2">
              <Input
                aria-label={t('gradingSettings.domain')}
                disabled={!editable}
                required
                maxLength={80}
                value={draft.domain}
                onChange={(event) => {
                  change(draft.key, { domain: event.target.value })
                }}
              />
              <Input
                aria-label={t('gradingSettings.skillLabel')}
                disabled={!editable}
                required
                maxLength={160}
                value={draft.label}
                onChange={(event) => {
                  change(draft.key, { label: event.target.value })
                }}
              />
              {editable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={draft.used}
                  title={draft.used ? t('gradingSettings.used') : undefined}
                  aria-label={t('gradingSettings.remove', { name: draft.label })}
                  onClick={() => {
                    setDrafts((previous) => previous.filter((other) => other.key !== draft.key))
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              ) : (
                <span />
              )}
            </div>
          ))}
          {editable && (
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDrafts((previous) => [
                    ...previous,
                    {
                      key: crypto.randomUUID(),
                      id: null,
                      domain: previous.at(-1)?.domain ?? '',
                      label: '',
                      used: false,
                    },
                  ])
                }}
              >
                <Plus aria-hidden />
                {t('gradingSettings.addSkill')}
              </Button>
              <Button type="submit" disabled={save.isPending || drafts.length === 0}>
                <Save aria-hidden />
                {t('gradingSettings.saveSkills')}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

const THRESHOLDS = ['congratulations', 'honor_roll', 'encouragement', 'warning_below'] as const

function MentionsCard({ settings }: { settings: GradingSettings }) {
  const { t } = useTranslation()
  const save = useSaveMentionThresholds()
  const [values, setValues] = useState<Record<(typeof THRESHOLDS)[number], string>>(() => ({
    congratulations: String(settings.mentions.congratulations),
    honor_roll: String(settings.mentions.honor_roll),
    encouragement: String(settings.mentions.encouragement),
    warning_below: String(settings.mentions.warning_below),
  }))
  const editable = settings.can_manage
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('gradingSettings.mentions')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            save
              .mutateAsync({
                cycleId: settings.cycle.id,
                congratulations: Number(values.congratulations.replace(',', '.')),
                honor_roll: Number(values.honor_roll.replace(',', '.')),
                encouragement: Number(values.encouragement.replace(',', '.')),
                warning_below: Number(values.warning_below.replace(',', '.')),
              })
              .then(() => {
                toast(t('gradingSettings.saved'), { tone: 'success' })
              })
              .catch((error: unknown) => {
                toast(failure(error, t('gradingSettings.failed')), { tone: 'error' })
              })
          }}
        >
          <p className="text-sm text-muted-foreground">
            {t('gradingSettings.mentionsHint', { scale: settings.cycle.grade_scale })}
          </p>
          <div className="grid gap-3 sm:grid-cols-4">
            {THRESHOLDS.map((key) => (
              <label key={key} className="grid gap-1 text-sm font-medium">
                {t(`gradingSettings.thresholds.${key}`)}
                <Input
                  inputMode="decimal"
                  disabled={!editable}
                  required
                  value={values[key]}
                  onChange={(event) => {
                    setValues((previous) => ({ ...previous, [key]: event.target.value }))
                  }}
                />
              </label>
            ))}
          </div>
          {editable && (
            <div className="flex justify-end">
              <Button type="submit" disabled={save.isPending}>
                <Save aria-hidden />
                {t('gradingSettings.saveMentions')}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

/**
 * Réglages des notes (onglet des Paramètres) : périodes du cycle, matières et coefficients par niveau (moyenne
 * pondérée) ou référentiel de compétences, pour l'année en cours.
 */
export function GradingSettingsPanel({ cycles }: { cycles: readonly Cycle[] }) {
  const { t } = useTranslation()
  const graded = cycles.filter(
    (cycle) =>
      cycle.settings.assessment_mode === 'weighted_average' ||
      cycle.settings.assessment_mode === 'competency',
  )
  const [cycleId, setCycleId] = useState('')
  const cycle = graded.find((candidate) => candidate.id === cycleId) ?? graded[0]
  const settings = useGradingSettings(cycle?.id ?? '')

  if (cycle === undefined) {
    return <p className="text-sm text-muted-foreground">{t('gradingSettings.noCycle')}</p>
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t('gradingSettings.description')}</p>
        <NativeSelect
          aria-label={t('gradingSettings.cycle')}
          className="w-auto"
          value={cycle.id}
          onChange={(event) => {
            setCycleId(event.target.value)
          }}
        >
          {graded.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <QueryState query={settings}>
        {(data) => (
          <div className="grid gap-4" key={`${data.cycle.id}-${data.academic_year.id}`}>
            <p className="text-sm">
              {t('gradingSettings.year', { year: data.academic_year.label })}
              {!data.can_manage && ` · ${t('gradingSettings.readOnly')}`}
            </p>
            <TermsCard key={data.terms.map((term) => term.id).join()} settings={data} />
            {data.cycle.mode === 'weighted_average' && (
              <MentionsCard
                key={`${data.cycle.id}-${String(data.mentions.congratulations)}-${String(data.mentions.warning_below)}`}
                settings={data}
              />
            )}
            {data.cycle.mode === 'weighted_average' ? (
              <SubjectsCard
                key={data.levels.map((level) => level.subjects.map((s) => s.id).join()).join('|')}
                settings={data}
              />
            ) : (
              <SkillsCard key={data.skills.map((skill) => skill.id).join()} settings={data} />
            )}
          </div>
        )}
      </QueryState>
    </div>
  )
}
