import { describe, expect, it } from 'vitest'

import { generateSchool } from '@/lib/demo/dataset'

import { daycareBoard } from './demo'

describe('garderie', () => {
  it('liste les enfants des classes choisies d’après le paramètre du cycle, quel que soit le cycle', () => {
    const school = generateSchool('les-lauriers', new Date('2026-11-04T09:00:00Z'))
    const kindergarten = school.classrooms.find((classroom) => classroom.cycle === 'kindergarten')
    if (kindergarten === undefined) throw new Error('Aucune classe de maternelle')

    const board = daycareBoard(school, '2026-11-04', [kindergarten.id])

    expect(board.children.length).toBeGreaterThan(0)
    expect(board.children.every((child) => child.student.classroomId === kindergarten.id)).toBe(
      true,
    )
  })
})
