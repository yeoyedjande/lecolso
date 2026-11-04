import { describe, expect, it } from 'vitest'

import { DEMO_PARENT, DEMO_TEACHER, generateSchool } from '@/lib/demo/dataset'

import { messageParent, myClasses, teacherConversations } from '../teacher/demo'

import {
  childDetail,
  justifyAbsence,
  myChildren,
  parentConversations,
  parentPayments,
  payMobile,
} from './demo'

const NOW = new Date('2026-11-04T09:00:00Z')
const TODAY = '2026-11-04'

describe('espace parent (démonstration)', () => {
  it('le parent démo a ses enfants dans chaque école, et seulement eux', () => {
    const lauriers = generateSchool('les-lauriers', NOW)
    const children = myChildren(lauriers, DEMO_PARENT.phone, TODAY)
    expect(children.map((child) => child.classroom.name).sort()).toEqual(['CE1 A', 'Crèche A'])
    expect(myChildren(generateSchool('petits-genies', NOW), DEMO_PARENT.phone, TODAY)).toHaveLength(
      1,
    )
    expect(myChildren(lauriers, '+2250799999999', TODAY)).toEqual([])
  })

  it('la fiche d’un enfant d’une autre famille est introuvable (null)', () => {
    const school = generateSchool('les-lauriers', NOW)
    const stranger = school.students.find(
      (student) => !student.guardians.some((g) => g.phone === DEMO_PARENT.phone),
    )
    if (stranger === undefined) throw new Error('Aucun autre élève')
    expect(childDetail(school, DEMO_PARENT.phone, stranger.id, TODAY)).toBeNull()
    expect(() =>
      payMobile(
        school,
        {
          phone: DEMO_PARENT.phone,
          studentId: stranger.id,
          amount: 10_000,
          operator: 'wave',
          walletPhone: DEMO_PARENT.phone,
        },
        NOW,
      ),
    ).toThrow()
  })

  it('paiement Mobile Money : reçu numéroté, visible dans l’historique du parent', () => {
    const school = generateSchool('les-lauriers', NOW)
    const child = myChildren(school, DEMO_PARENT.phone, TODAY)[0]
    if (child === undefined) throw new Error('Aucun enfant')
    const payment = payMobile(
      school,
      {
        phone: DEMO_PARENT.phone,
        studentId: child.student.id,
        amount: 30_000,
        operator: 'orange_money',
        walletPhone: DEMO_PARENT.phone,
      },
      NOW,
    )
    expect(payment.receiptNumber).toMatch(/^REC-2026-\d{6}$/)
    expect(parentPayments(school, DEMO_PARENT.phone)[0]?.id).toBe(payment.id)
  })

  it('justification : jours ouvrés seulement, absences excusées', () => {
    const school = generateSchool('les-lauriers', NOW)
    const child = myChildren(school, DEMO_PARENT.phone, TODAY)[0]
    if (child === undefined) throw new Error('Aucun enfant')
    // Du vendredi 06/11 au lundi 09/11 : 2 jours de classe
    const count = justifyAbsence(school, {
      phone: DEMO_PARENT.phone,
      studentId: child.student.id,
      from: '2026-11-06',
      to: '2026-11-09',
      reason: 'illness',
      comment: '',
    })
    expect(count).toBe(2)
    expect(
      school.attendance
        .filter(
          (a) =>
            a.studentId === child.student.id && a.date >= '2026-11-06' && a.date <= '2026-11-09',
        )
        .every((a) => a.justified),
    ).toBe(true)
  })

  it('messages : seulement les conversations du parent', () => {
    const conversations = parentConversations(
      generateSchool('les-lauriers', NOW),
      DEMO_PARENT.phone,
    )
    expect(conversations.length).toBeGreaterThan(0)
    expect(
      conversations.every((conversation) => conversation.guardianPhone === DEMO_PARENT.phone),
    ).toBe(true)
  })
})

describe('espace enseignant (démonstration)', () => {
  it('l’enseignante démo est titulaire de CE1 A et CM1 A', () => {
    const classes = myClasses(generateSchool('les-lauriers', NOW), DEMO_TEACHER.phone, TODAY)
    expect(classes.map((classroom) => classroom.name)).toEqual(['CE1 A', 'CM1 A'])
  })

  it('message aux parents : seulement pour un élève de ses classes', () => {
    const school = generateSchool('les-lauriers', NOW)
    const own = school.students.find((student) => student.classroomId === 'lau-ce1-a')
    const other = school.students.find((student) => student.classroomId === 'lau-cp1-a')
    if (own === undefined || other === undefined) throw new Error('Données manquantes')
    messageParent(
      school,
      {
        phone: DEMO_TEACHER.phone,
        studentId: own.id,
        subject: 'Sortie',
        body: 'Bonjour',
        author: 'Fatou',
      },
      NOW,
    )
    expect(
      teacherConversations(school, DEMO_TEACHER.phone).some((c) => c.subject === 'Sortie'),
    ).toBe(true)
    expect(() =>
      messageParent(
        school,
        {
          phone: DEMO_TEACHER.phone,
          studentId: other.id,
          subject: 'X',
          body: 'Y',
          author: 'Fatou',
        },
        NOW,
      ),
    ).toThrow()
  })
})
