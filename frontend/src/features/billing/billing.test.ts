import { describe, expect, it } from 'vitest'

import { generateSchool } from '@/lib/demo/dataset'

import { parseAmount } from './amount'
import { balanceOf, cashDesk, recordPayment, unpaid } from './demo'

const NOW = new Date('2026-11-04T09:00:00Z')
const TODAY = '2026-11-04'

describe('montant saisi au guichet', () => {
  it.each([
    ['150 000', 150_000],
    ['150 000', 150_000],
    ['25.000', 25_000],
    ['0', null],
    ['', null],
    ['12,5', null],
    ['-500', null],
  ])('« %s » → %s', (text, expected) => {
    expect(parseAmount(text)).toBe(expected)
  })
})

describe('encaissement (démonstration)', () => {
  it('numéro de reçu séquentiel, solde et caisse du jour mis à jour', () => {
    const school = generateSchool('les-lauriers', NOW)
    const student = school.students[0]
    if (student === undefined) throw new Error('Aucun élève')
    const before = balanceOf(school, student.id, TODAY)
    const lastNumber = school.payments.length

    const first = recordPayment(
      school,
      { studentId: student.id, amount: 10_000, method: 'cash', reference: null, cashier: 'Awa' },
      NOW,
    )
    const second = recordPayment(
      school,
      { studentId: student.id, amount: 5_000, method: 'wave', reference: 'W1', cashier: 'Awa' },
      NOW,
    )

    expect(first.receiptNumber).toBe(`REC-2026-${String(lastNumber + 1).padStart(6, '0')}`)
    expect(second.receiptNumber).toBe(`REC-2026-${String(lastNumber + 2).padStart(6, '0')}`)
    expect(balanceOf(school, student.id, TODAY).paid).toBe(before.paid + 15_000)
    expect(cashDesk(school, TODAY).payments.map((payment) => payment.id)).toEqual(
      expect.arrayContaining([first.id, second.id]),
    )
  })

  it('refuse un montant non entier ou nul', () => {
    const school = generateSchool('les-lauriers', NOW)
    const id = school.students[0]?.id ?? ''
    expect(() =>
      recordPayment(
        school,
        { studentId: id, amount: 0, method: 'cash', reference: null, cashier: '' },
        NOW,
      ),
    ).toThrow()
    expect(() =>
      recordPayment(
        school,
        { studentId: id, amount: 10.5, method: 'cash', reference: null, cashier: '' },
        NOW,
      ),
    ).toThrow()
  })

  it('impayés : uniquement des retards positifs, triés du plus grand au plus petit', () => {
    const rows = unpaid(generateSchool('les-lauriers', NOW), TODAY)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.overdue > 0)).toBe(true)
    expect(rows.map((row) => row.overdue)).toEqual(
      [...rows.map((row) => row.overdue)].sort((a, b) => b - a),
    )
  })
})

describe('ancienneté des impayés', () => {
  it('compte le retard depuis la plus ancienne échéance non réglée, pas depuis la première de l’année', () => {
    const school = generateSchool('les-lauriers', NOW)
    const student = school.students[0]
    if (student === undefined) throw new Error('Aucun élève')
    const own = school.installments.filter((installment) => installment.studentId === student.id)
    // Inscription réglée, scolarité (échéance du 05/10/2026) impayée
    const registration = own
      .filter((installment) => installment.kind === 'registration')
      .reduce((sum, i) => sum + i.amount, 0)
    school.payments = school.payments.filter((payment) => payment.studentId !== student.id)
    recordPayment(
      school,
      { studentId: student.id, amount: registration, method: 'cash', reference: null, cashier: '' },
      NOW,
    )

    const row = unpaid(school, TODAY).find((candidate) => candidate.student.id === student.id)
    expect(row?.daysLate).toBe(30)
  })
})
