import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'
import { enqueue, isNetworkError } from '@/lib/offline/outbox'
import { uuidv7 } from '@/lib/offline/uuid'

export type GradingClassroom = components['schemas']['GradingClassroomResource']
export type GradeGrid = components['schemas']['GradeGridResource']
export type GradeGridRow = components['schemas']['GradeGridRowResource']
export type Assessment = components['schemas']['AssessmentResource']
export type ClassResults = components['schemas']['ClassResultsResource']
export type SkillGrid = components['schemas']['SkillGridResource']
export type GradingSettings = components['schemas']['GradingSettingsResource']
export type Term = components['schemas']['TermResource']
export type SkillLevel = 'A' | 'EA' | 'NA'

export interface GradeInput {
  student_id: string
  value: number | null
  absent: boolean
}

function useGradingKey() {
  const school = useCurrentSchool()
  return { school, key: ['school', school?.id ?? null, 'grading'] as const }
}

/** Classes de l'année que l'utilisateur voit pour les notes, avec leur mode d'évaluation et le droit de saisie. */
export function useGradingClassrooms() {
  const { school, key } = useGradingKey()
  return useQuery({
    queryKey: [...key, 'classrooms'],
    enabled: school !== null,
    queryFn: async ({ signal }): Promise<GradingClassroom[]> => {
      const { data, error } = await api.GET('/grading/classrooms', { signal })
      if (data === undefined) throw new Error('Classes indisponibles', { cause: error })
      return data.data
    },
  })
}

/** Grille de notes d'une classe (période et matière : celles du jour et la première si `null`). */
export function useGradeGrid(classroomId: string, termId: string | null, subjectId: string | null) {
  const { school, key } = useGradingKey()
  return useQuery({
    queryKey: [...key, 'grid', classroomId, termId, subjectId],
    enabled: school !== null && classroomId !== '',
    queryFn: async ({ signal }): Promise<GradeGrid> => {
      const { data, error } = await api.GET('/classrooms/{classroom}/grade-grid', {
        params: {
          path: { classroom: classroomId },
          query: { term_id: termId, subject_id: subjectId },
        },
        signal,
      })
      if (data === undefined) throw new Error('Notes indisponibles', { cause: error })
      return data.data
    },
  })
}

/** Remplace, dans les grilles en cache de la classe, celle de la période et de la matière données. */
function useUpdateGrids() {
  const { key } = useGradingKey()
  const queryClient = useQueryClient()
  return (
    classroomId: string,
    termId: string,
    subjectId: string,
    update: (grid: GradeGrid) => GradeGrid,
  ) => {
    queryClient.setQueriesData<GradeGrid>({ queryKey: [...key, 'grid', classroomId] }, (grid) =>
      grid?.term.id === termId && grid.subject?.id === subjectId ? update(grid) : grid,
    )
  }
}

export interface AssessmentInput {
  classroomId: string
  subject_id: string
  term_id: string
  title: string
  date: string
  out_of: number
}

/**
 * Crée une évaluation avec un identifiant généré sur l'appareil. Hors connexion : mise en file (POST /sync) et
 * ajoutée tout de suite à la grille affichée ; renvoie alors `queued`.
 */
export function useCreateAssessment() {
  const { school, key } = useGradingKey()
  const queryClient = useQueryClient()
  const updateGrids = useUpdateGrids()
  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ classroomId, ...body }: AssessmentInput): Promise<{ queued: boolean }> => {
      const id = uuidv7()
      const queue = async () => {
        if (school === null) throw new Error('Aucune école')
        await enqueue(school.id, 'grades.assessment', {
          ...body,
          assessment_id: id,
          classroom_id: classroomId,
          recorded_at: new Date().toISOString(),
        })
        updateGrids(classroomId, body.term_id, body.subject_id, (grid) => ({
          ...grid,
          assessments: [...grid.assessments, { id, classroom_id: classroomId, ...body }],
          rows: grid.rows.map((row) => ({
            ...row,
            grades: [...row.grades, { assessment_id: id, value: null, absent: false }],
          })),
        }))
        return { queued: true }
      }
      if (!navigator.onLine) return queue()
      try {
        const { data, response } = await api.POST('/classrooms/{classroom}/assessments', {
          params: { path: { classroom: classroomId } },
          body: { ...body, id },
        })
        if (data === undefined) throw new Error(`Création impossible (${String(response.status)})`)
        return { queued: false }
      } catch (error) {
        if (isNetworkError(error)) return queue()
        throw error
      }
    },
    onSuccess: async ({ queued }) => {
      if (!queued) await queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

/** Modifier une évaluation (titre, date, barème) : en ligne seulement. */
export function useUpdateAssessment() {
  const { key } = useGradingKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Omit<AssessmentInput, 'classroomId'> & { id: string }) => {
      const { data, response } = await api.PATCH('/assessments/{assessment}', {
        params: { path: { assessment: id } },
        body,
      })
      if (data === undefined)
        throw new Error(`Modification impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

/** Supprimer une évaluation et ses notes : en ligne seulement. */
export function useDeleteAssessment() {
  const { key } = useGradingKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { response } = await api.DELETE('/assessments/{assessment}', {
        params: { path: { assessment: id } },
      })
      if (!response.ok) throw new Error(`Suppression impossible (${String(response.status)})`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

/**
 * Notes d'une évaluation (une cellule ou plusieurs). Hors connexion : mises en file avec l'heure de saisie (la
 * saisie la plus récente gagne au serveur) et reportées dans la grille affichée.
 */
export function useSaveGrades() {
  const { school, key } = useGradingKey()
  const queryClient = useQueryClient()
  const updateGrids = useUpdateGrids()
  return useMutation({
    networkMode: 'always',
    mutationFn: async (input: {
      assessment: Assessment
      grades: GradeInput[]
    }): Promise<{ queued: boolean }> => {
      const { assessment, grades } = input
      const recordedAt = new Date().toISOString()
      const apply = (grid: GradeGrid): GradeGrid => ({
        ...grid,
        rows: grid.rows.map((row) => {
          const grade = grades.find((candidate) => candidate.student_id === row.student.id)
          return grade === undefined
            ? row
            : {
                ...row,
                grades: row.grades.map((cell) =>
                  cell.assessment_id === assessment.id
                    ? { ...cell, value: grade.absent ? null : grade.value, absent: grade.absent }
                    : cell,
                ),
              }
        }),
      })
      const queue = async () => {
        if (school === null) throw new Error('Aucune école')
        await enqueue(school.id, 'grades.save', {
          assessment_id: assessment.id,
          grades,
          recorded_at: recordedAt,
        })
        updateGrids(assessment.classroom_id, assessment.term_id, assessment.subject_id, apply)
        return { queued: true }
      }
      if (!navigator.onLine) return queue()
      try {
        const { data, response } = await api.PUT('/assessments/{assessment}/grades', {
          params: { path: { assessment: assessment.id } },
          body: { grades },
        })
        if (data === undefined)
          throw new Error(`Enregistrement impossible (${String(response.status)})`)
        updateGrids(
          assessment.classroom_id,
          assessment.term_id,
          assessment.subject_id,
          () => data.data,
        )
        return { queued: false }
      } catch (error) {
        if (isNetworkError(error)) return queue()
        throw error
      }
    },
    onSuccess: async ({ queued }) => {
      // Résultats de la classe recalculés au prochain affichage
      if (!queued) await queryClient.invalidateQueries({ queryKey: [...key, 'results'] })
    },
  })
}

/** Résultats d'une classe pour une période : moyennes, rangs, moyenne de classe, ou bilan des compétences. */
export function useClassResults(classroomId: string, termId: string | null) {
  const { school, key } = useGradingKey()
  return useQuery({
    queryKey: [...key, 'results', classroomId, termId],
    enabled: school !== null && classroomId !== '',
    queryFn: async ({ signal }): Promise<ClassResults> => {
      const { data, error } = await api.GET('/classrooms/{classroom}/results', {
        params: { path: { classroom: classroomId }, query: { term_id: termId } },
        signal,
      })
      if (data === undefined) throw new Error('Résultats indisponibles', { cause: error })
      return data.data
    },
  })
}

/** Compétences d'une classe pour une période (celle du jour si `null`). */
export function useSkillGrid(classroomId: string, termId: string | null) {
  const { school, key } = useGradingKey()
  return useQuery({
    queryKey: [...key, 'skills', classroomId, termId],
    enabled: school !== null && classroomId !== '',
    queryFn: async ({ signal }): Promise<SkillGrid> => {
      const { data, error } = await api.GET('/classrooms/{classroom}/skills', {
        params: { path: { classroom: classroomId }, query: { term_id: termId } },
        signal,
      })
      if (data === undefined) throw new Error('Compétences indisponibles', { cause: error })
      return data.data
    },
  })
}

/** Niveaux de compétences (A, EA, NA, ou null pour effacer). Hors connexion : mis en file et affichés. */
export function useSaveSkills() {
  const { school, key } = useGradingKey()
  const queryClient = useQueryClient()
  return useMutation({
    networkMode: 'always',
    mutationFn: async (input: {
      classroomId: string
      termId: string
      evaluations: { student_id: string; skill_id: string; level: SkillLevel | null }[]
    }): Promise<{ queued: boolean }> => {
      const body = { term_id: input.termId, evaluations: input.evaluations }
      const apply = (grid: SkillGrid | undefined): SkillGrid | undefined =>
        grid?.term.id !== input.termId
          ? grid
          : {
              ...grid,
              rows: grid.rows.map((row) => ({
                ...row,
                levels: row.levels.map((cell) => {
                  const change = input.evaluations.find(
                    (evaluation) =>
                      evaluation.student_id === row.student.id &&
                      evaluation.skill_id === cell.skill_id,
                  )
                  return change === undefined ? cell : { ...cell, level: change.level }
                }),
              })),
            }
      // Affichage immédiat, en ligne comme hors connexion
      queryClient.setQueriesData<SkillGrid>(
        { queryKey: [...key, 'skills', input.classroomId] },
        apply,
      )
      const queue = async () => {
        if (school === null) throw new Error('Aucune école')
        await enqueue(school.id, 'skills.save', {
          ...body,
          classroom_id: input.classroomId,
          recorded_at: new Date().toISOString(),
        })
        return { queued: true }
      }
      if (!navigator.onLine) return queue()
      try {
        const { data, response } = await api.PUT('/classrooms/{classroom}/skills', {
          params: { path: { classroom: input.classroomId } },
          body,
        })
        if (data === undefined)
          throw new Error(`Enregistrement impossible (${String(response.status)})`)
        queryClient.setQueriesData<SkillGrid>(
          { queryKey: [...key, 'skills', input.classroomId] },
          (grid) => (grid?.term.id !== input.termId ? grid : data.data),
        )
        return { queued: false }
      } catch (error) {
        if (isNetworkError(error)) return queue()
        throw error
      }
    },
    onError: async () => {
      await queryClient.invalidateQueries({ queryKey: [...key, 'skills'] })
    },
    onSuccess: async ({ queued }) => {
      if (!queued) await queryClient.invalidateQueries({ queryKey: [...key, 'results'] })
    },
  })
}

/** Réglages des notes d'un cycle (année en cours) : périodes, matières par niveau, compétences. */
export function useGradingSettings(cycleId: string) {
  const { school, key } = useGradingKey()
  return useQuery({
    queryKey: [...key, 'settings', cycleId],
    enabled: school !== null && cycleId !== '',
    retry: false,
    queryFn: async ({ signal }): Promise<GradingSettings> => {
      const { data, error } = await api.GET('/grading/settings', {
        params: { query: { cycle_id: cycleId } },
        signal,
      })
      if (data === undefined) throw new Error('Réglages indisponibles', { cause: error })
      return data.data
    },
  })
}

function useSettingsMutation<Input>(send: (input: Input) => Promise<GradingSettings | undefined>) {
  const { key } = useGradingKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Input): Promise<GradingSettings> => {
      const settings = await send(input)
      if (settings === undefined) throw new Error('Enregistrement impossible')
      return settings
    },
    onSuccess: async (settings) => {
      queryClient.setQueryData([...key, 'settings', settings.cycle.id], settings)
      await queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

/** Périodes d'un cycle (libellé et dates). */
export function useSaveTerms() {
  return useSettingsMutation(
    async (input: {
      cycleId: string
      yearId: string
      terms: { label: string; starts_on: string; ends_on: string }[]
    }) => {
      const { data } = await api.PUT('/grading/cycles/{cycle}/terms', {
        params: { path: { cycle: input.cycleId } },
        body: { academic_year_id: input.yearId, terms: input.terms },
      })
      return data?.data
    },
  )
}

/** Matières et coefficients d'un niveau, dans l'ordre. */
export function useSaveSubjects() {
  return useSettingsMutation(
    async (input: {
      levelId: string
      yearId: string
      subjects: { id: string | null; name: string; coefficient: number }[]
    }) => {
      const { data } = await api.PUT('/grading/levels/{level}/subjects', {
        params: { path: { level: input.levelId } },
        body: { academic_year_id: input.yearId, subjects: input.subjects },
      })
      return data?.data
    },
  )
}

/** Référentiel de compétences d'un cycle, dans l'ordre. */
export function useSaveSkillCatalog() {
  return useSettingsMutation(
    async (input: {
      cycleId: string
      yearId: string
      skills: { id: string | null; domain: string; label: string }[]
    }) => {
      const { data } = await api.PUT('/grading/cycles/{cycle}/skills', {
        params: { path: { cycle: input.cycleId } },
        body: { academic_year_id: input.yearId, skills: input.skills },
      })
      return data?.data
    },
  )
}

export type ReportCards = components['schemas']['ReportCardsResource']
export type ReportCardRow = components['schemas']['ReportCardRowResource']
export type Mention = 'congratulations' | 'honor_roll' | 'encouragement' | 'warning'
export type MentionThresholds = GradingSettings['mentions']

/** Bulletins d'une classe pour une période (celle du jour si `null`) : résultats, appréciations, validation, PDF. */
export function useReportCards(classroomId: string, termId: string | null) {
  const { school, key } = useGradingKey()
  return useQuery<ReportCards>({
    queryKey: [...key, 'report-cards', classroomId, termId],
    enabled: school !== null && classroomId !== '',
    // Rendu PDF en file d'attente : relu toutes les 5 secondes tant qu'un bulletin est en attente
    refetchInterval: (query) =>
      query.state.data?.rows.some((row) => row.report_card?.status === 'pending') === true
        ? 5000
        : false,
    queryFn: async ({ signal }): Promise<ReportCards> => {
      const { data, error } = await api.GET('/classrooms/{classroom}/report-cards', {
        params: { path: { classroom: classroomId }, query: { term_id: termId } },
        signal,
      })
      if (data === undefined) throw new Error('Bulletins indisponibles', { cause: error })
      return data.data
    },
  })
}

function useReportCardsMutation<Input extends { classroomId: string }>(
  send: (input: Input) => Promise<ReportCards | undefined>,
) {
  const { key } = useGradingKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Input): Promise<ReportCards> => {
      const data = await send(input)
      if (data === undefined) throw new Error('Enregistrement impossible')
      return data
    },
    onSuccess: async (data, input) => {
      queryClient.setQueriesData<ReportCards>(
        { queryKey: [...key, 'report-cards', input.classroomId] },
        (current) => (current?.term.id === data.term.id ? data : current),
      )
      // Grilles de notes et de compétences : verrouillées ou déverrouillées
      await queryClient.invalidateQueries({ queryKey: [...key, 'grid', input.classroomId] })
      await queryClient.invalidateQueries({ queryKey: [...key, 'skills', input.classroomId] })
    },
  })
}

/** Appréciations d'un élève : champs du titulaire et/ou de la direction (un champ absent ne change pas). */
export function useSaveAppreciation() {
  return useReportCardsMutation(
    async (input: {
      classroomId: string
      termId: string
      studentId: string
      teacher_comment?: string | null
      subjects?: { subject_id: string; comment: string | null }[]
      director_comment?: string | null
      mention?: Mention | null
    }) => {
      const { classroomId, termId, studentId, ...fields } = input
      const { data } = await api.PUT('/classrooms/{classroom}/appreciations', {
        params: { path: { classroom: classroomId } },
        body: { term_id: termId, student_id: studentId, ...fields },
      })
      return data?.data
    },
  )
}

/** Valider les bulletins d'une classe pour une période (direction) : notes figées, PDF rendus en file. */
export function useCloseTerm() {
  return useReportCardsMutation(async (input: { classroomId: string; termId: string }) => {
    const { data } = await api.POST('/classrooms/{classroom}/report-cards/close', {
      params: { path: { classroom: input.classroomId } },
      body: { term_id: input.termId },
    })
    return data?.data
  })
}

/** Déverrouiller une période validée (direction), motif obligatoire. */
export function useReopenTerm() {
  return useReportCardsMutation(
    async (input: { classroomId: string; termId: string; reason: string }) => {
      const { data } = await api.POST('/classrooms/{classroom}/report-cards/reopen', {
        params: { path: { classroom: input.classroomId } },
        body: { term_id: input.termId, reason: input.reason },
      })
      return data?.data
    },
  )
}

/** Relancer le rendu des bulletins PDF en échec (direction). */
export function useRetryReportCards() {
  return useReportCardsMutation(async (input: { classroomId: string; termId: string }) => {
    const { data } = await api.POST('/classrooms/{classroom}/report-cards/retry', {
      params: { path: { classroom: input.classroomId } },
      body: { term_id: input.termId },
    })
    return data?.data
  })
}

/** Seuils des mentions d'un cycle, sur son échelle. */
export function useSaveMentionThresholds() {
  return useSettingsMutation(async (input: { cycleId: string } & MentionThresholds) => {
    const { cycleId, ...body } = input
    const { data } = await api.PUT('/grading/cycles/{cycle}/mentions', {
      params: { path: { cycle: cycleId } },
      body,
    })
    return data?.data
  })
}
