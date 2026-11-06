import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { GradeGrid } from '../api'
import { GradeGridEditor } from './GradeGridEditor'

function grid(awa: number | null, yao: number | null): GradeGrid {
  const assessment = {
    id: 'a1',
    classroom_id: 'c1',
    subject_id: 's1',
    term_id: 't1',
    title: 'Dictée',
    date: '2026-10-02',
    out_of: 20,
  }
  const student = (id: string, name: string) => ({
    id,
    full_name: name,
    first_name: name,
    matricule: id,
    photo_url: null,
  })
  return {
    classroom: { id: 'c1', name: 'CE1 A' },
    grade_scale: 10,
    terms: [
      {
        id: 't1',
        position: 1,
        label: '1er trimestre',
        starts_on: '2026-09-14',
        ends_on: '2026-12-22',
      },
    ],
    term: {
      id: 't1',
      position: 1,
      label: '1er trimestre',
      starts_on: '2026-09-14',
      ends_on: '2026-12-22',
    },
    subjects: [{ id: 's1', name: 'Français', coefficient: 3, position: 1 }],
    subject: { id: 's1', name: 'Français', coefficient: 3, position: 1 },
    assessments: [assessment],
    rows: [
      {
        student: student('awa', 'KONÉ Awa'),
        grades: [{ assessment_id: 'a1', value: awa, absent: false }],
        average: null,
      },
      {
        student: student('yao', 'KOUASSI Yao'),
        grades: [{ assessment_id: 'a1', value: yao, absent: false }],
        average: null,
      },
    ],
    can_manage: true,
  }
}

describe('grille de notes', () => {
  it('reprend les notes relues du serveur sans écraser une saisie en cours', async () => {
    const client = new QueryClient()
    const view = (data: GradeGrid) => (
      <QueryClientProvider client={client}>
        <GradeGridEditor grid={data} onEdit={() => undefined} />
      </QueryClientProvider>
    )
    const { rerender } = render(view(grid(12, null)))
    const awa = screen.getByRole('textbox', { name: 'Note de KONÉ Awa, Dictée' })
    const yao = screen.getByRole('textbox', { name: 'Note de KOUASSI Yao, Dictée' })
    expect(awa).toHaveValue('12')

    // Saisie en cours pour Yao, puis la grille est relue : Awa corrigée ailleurs, Yao aussi
    await userEvent.type(yao, '9')
    rerender(view(grid(15, 7)))

    expect(awa).toHaveValue('15')
    expect(yao).toHaveValue('9')
  })
})
