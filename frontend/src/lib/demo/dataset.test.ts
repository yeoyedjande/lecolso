import { describe, expect, it } from 'vitest'

import { generateSchool } from './dataset'

const NOW = new Date('2026-11-04T09:00:00Z')

describe('données de démonstration', () => {
  const lauriers = generateSchool('les-lauriers', NOW)
  const genies = generateSchool('petits-genies', NOW)

  it('sont déterministes', () => {
    expect(generateSchool('les-lauriers', NOW)).toEqual(lauriers)
  })

  it('respectent les cycles de chaque école', () => {
    expect(lauriers.cycles).toEqual(['daycare', 'kindergarten', 'primary'])
    expect(genies.cycles).toEqual(['daycare', 'kindergarten'])
    expect(genies.subjects).toEqual([])
  })

  it('sont cohérentes : chaque paiement, note et présence vise un élève existant', () => {
    const ids = new Set(lauriers.students.map((student) => student.id))
    expect(lauriers.payments.every((payment) => ids.has(payment.studentId))).toBe(true)
    expect(lauriers.grades.every((grade) => ids.has(grade.studentId))).toBe(true)
    expect(lauriers.attendance.every((entry) => ids.has(entry.studentId))).toBe(true)
    expect(
      lauriers.students.every((student) =>
        lauriers.classrooms.some((c) => c.id === student.classroomId),
      ),
    ).toBe(true)
  })

  it('montants entiers en FCFA et reçus séquentiels', () => {
    expect(
      lauriers.payments.every((payment) => Number.isInteger(payment.amount) && payment.amount > 0),
    ).toBe(true)
    expect(lauriers.installments.every((installment) => Number.isInteger(installment.amount))).toBe(
      true,
    )
    const numbers = lauriers.payments.map((payment) => payment.receiptNumber)
    expect(numbers[0]).toBe('REC-2026-000001')
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it('téléphones au format E.164 ivoirien', () => {
    const phones = lauriers.students.flatMap((student) =>
      student.guardians.map((guardian) => guardian.phone),
    )
    expect(phones.every((value) => /^\+225(01|05|07)\d{8}$/.test(value))).toBe(true)
  })

  it('contient des impayés et des encaissements du jour', () => {
    const total = lauriers.installments.reduce((sum, installment) => sum + installment.amount, 0)
    const paid = lauriers.payments.reduce((sum, payment) => sum + payment.amount, 0)
    expect(paid).toBeLessThan(total)
    expect(lauriers.payments.some((payment) => payment.paidAt.startsWith('2026-11-04'))).toBe(true)
  })
})
