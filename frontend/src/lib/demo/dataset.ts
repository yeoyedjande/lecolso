import { addDays, at, demoToday, schoolDays, YEAR_LABEL, YEAR_START } from './dates'
import {
  ADULT_FEMALE,
  ADULT_MALE,
  BOY_NAMES,
  DISTRICTS,
  FAMILY_NAMES,
  GIRL_NAMES,
  MEDICAL_NOTES,
  PROFESSIONS,
} from './names'
import { createRandom, seedFrom, type Random } from './random'
import type {
  AttendanceStatus,
  CycleCode,
  DemoActivity,
  DemoAnnouncement,
  DemoAssessment,
  DemoAttendance,
  DemoClassroom,
  DemoConversation,
  DemoDaycareLog,
  DemoDaycareVisit,
  DemoEvent,
  DemoFee,
  DemoGrade,
  DemoGuardian,
  DemoInstallment,
  DemoLevel,
  DemoPayment,
  DemoRollCall,
  DemoSchool,
  DemoSkill,
  DemoSkillEvaluation,
  DemoStaff,
  DemoStudent,
  DemoSubject,
  FeeKind,
  PaymentMethod,
  SkillLevel,
} from './types'

/** Vacances de l'année 2026-2027 (Toussaint, Noël, février, Pâques). */
export const HOLIDAYS: [string, string][] = [
  ['2026-10-30', '2026-11-02'],
  ['2026-12-19', '2027-01-04'],
  ['2027-02-13', '2027-02-21'],
  ['2027-03-27', '2027-04-11'],
]

export const LEVELS: DemoLevel[] = [
  { code: 'CRECHE', name: 'Crèche', cycle: 'daycare', position: 1 },
  { code: 'PS', name: 'Petite section', cycle: 'kindergarten', position: 2 },
  { code: 'MS', name: 'Moyenne section', cycle: 'kindergarten', position: 3 },
  { code: 'GS', name: 'Grande section', cycle: 'kindergarten', position: 4 },
  { code: 'CP1', name: 'CP1', cycle: 'primary', position: 5 },
  { code: 'CP2', name: 'CP2', cycle: 'primary', position: 6 },
  { code: 'CE1', name: 'CE1', cycle: 'primary', position: 7 },
  { code: 'CE2', name: 'CE2', cycle: 'primary', position: 8 },
  { code: 'CM1', name: 'CM1', cycle: 'primary', position: 9 },
  { code: 'CM2', name: 'CM2', cycle: 'primary', position: 10 },
]

/** Âge à la rentrée par niveau. */
const AGE: Record<string, number> = {
  CRECHE: 2,
  PS: 3,
  MS: 4,
  GS: 5,
  CP1: 6,
  CP2: 7,
  CE1: 8,
  CE2: 9,
  CM1: 10,
  CM2: 11,
}

const TUITION: Record<CycleCode, number> = {
  daycare: 360_000,
  kindergarten: 300_000,
  primary: 270_000,
}
const TUITION_BONUS: Record<string, number> = { CE1: 10_000, CE2: 10_000, CM1: 20_000, CM2: 30_000 }

export const PRIMARY_SUBJECTS: DemoSubject[] = [
  { code: 'FR', name: 'Français', coefficient: 3 },
  { code: 'MATH', name: 'Mathématiques', coefficient: 3 },
  { code: 'EVEIL', name: 'Éveil (histoire, géographie, sciences)', coefficient: 2 },
  { code: 'ANG', name: 'Anglais', coefficient: 1 },
  { code: 'EDHC', name: 'Éducation civique et morale', coefficient: 1 },
  { code: 'EPS', name: 'Éducation physique', coefficient: 1 },
]

export const KINDERGARTEN_SKILLS: DemoSkill[] = [
  { id: 'sk-lang-1', domain: 'Langage oral', label: 'S’exprime par une phrase complète' },
  { id: 'sk-lang-2', domain: 'Langage oral', label: 'Récite une comptine' },
  { id: 'sk-lang-3', domain: 'Langage écrit', label: 'Reconnaît son prénom' },
  { id: 'sk-math-1', domain: 'Mathématiques', label: 'Dénombre une collection jusqu’à 10' },
  { id: 'sk-math-2', domain: 'Mathématiques', label: 'Reconnaît les formes simples' },
  { id: 'sk-mot-1', domain: 'Motricité', label: 'Tient correctement son crayon' },
  { id: 'sk-mot-2', domain: 'Motricité', label: 'Découpe en suivant un trait' },
  { id: 'sk-viv-1', domain: 'Vivre ensemble', label: 'Respecte les règles de la classe' },
  { id: 'sk-viv-2', domain: 'Vivre ensemble', label: 'Partage avec ses camarades' },
  { id: 'sk-art-1', domain: 'Arts', label: 'Chante en groupe' },
]

interface Template {
  name: string
  code: string
  address: string
  phone: string
  email: string
  motto: string
  classes: { level: string; sections: string[]; size: [number, number] }[]
}

const TEMPLATES: Record<string, Template> = {
  'les-lauriers': {
    name: 'Les Lauriers',
    code: 'LAU',
    address: 'Cocody Angré, 8e tranche, Abidjan',
    phone: '+2252722410000',
    email: 'contact@leslauriers.ci',
    motto: 'Grandir, apprendre, s’épanouir',
    classes: [
      { level: 'CRECHE', sections: ['A'], size: [10, 12] },
      { level: 'PS', sections: ['A'], size: [16, 20] },
      { level: 'MS', sections: ['A'], size: [16, 20] },
      { level: 'GS', sections: ['A'], size: [18, 22] },
      { level: 'CP1', sections: ['A'], size: [20, 24] },
      { level: 'CP2', sections: ['A'], size: [20, 24] },
      { level: 'CE1', sections: ['A', 'B'], size: [18, 22] },
      { level: 'CE2', sections: ['A'], size: [20, 24] },
      { level: 'CM1', sections: ['A'], size: [20, 24] },
      { level: 'CM2', sections: ['A'], size: [18, 22] },
    ],
  },
  'petits-genies': {
    name: 'Petits Génies',
    code: 'PGE',
    address: 'Riviera Palmeraie, Abidjan',
    phone: '+2252722550000',
    email: 'bonjour@petitsgenies.ci',
    motto: 'Chaque enfant est un génie',
    classes: [
      { level: 'CRECHE', sections: ['A', 'B'], size: [10, 12] },
      { level: 'PS', sections: ['A', 'B'], size: [14, 18] },
      { level: 'MS', sections: ['A'], size: [16, 20] },
      { level: 'GS', sections: ['A'], size: [16, 20] },
    ],
  },
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'cash',
  'cash',
  'orange_money',
  'orange_money',
  'mtn_momo',
  'wave',
  'wave',
  'moov_money',
  'cheque',
  'transfer',
]

function phone(random: Random): string {
  const prefix = random.pick(['07', '05', '01'])
  return `+225${prefix}${String(random.int(10_000_000, 99_999_999))}`
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0')
}

function teacherName(random: Random): string {
  return random.chance(0.7)
    ? `Mme ${random.pick(ADULT_FEMALE)} ${random.pick(FAMILY_NAMES)}`
    : `M. ${random.pick(ADULT_MALE)} ${random.pick(FAMILY_NAMES)}`
}

function guardiansFor(random: Random, lastName: string, prefix: string): DemoGuardian[] {
  const mother: DemoGuardian = {
    id: `${prefix}-g1`,
    name: `${random.pick(ADULT_FEMALE)} ${random.chance(0.6) ? lastName : random.pick(FAMILY_NAMES)}`,
    relation: 'Mère',
    phone: phone(random),
    profession: random.pick(PROFESSIONS),
    isPayer: false,
  }
  const father: DemoGuardian = {
    id: `${prefix}-g2`,
    name: `${random.pick(ADULT_MALE)} ${lastName}`,
    relation: 'Père',
    phone: phone(random),
    profession: random.pick(PROFESSIONS),
    isPayer: true,
  }
  if (random.chance(0.12)) {
    return [{ ...mother, id: `${prefix}-g1`, relation: 'Tutrice', isPayer: true }]
  }
  return random.chance(0.5)
    ? [father, mother]
    : [
        { ...mother, isPayer: true },
        { ...father, isPayer: false },
      ]
}

function feesFor(level: DemoLevel): DemoFee[] {
  const fees: DemoFee[] = [
    {
      levelCode: level.code,
      kind: 'registration',
      amount: level.cycle === 'daycare' ? 20_000 : 25_000,
      installments: 1,
      optional: false,
    },
    {
      levelCode: level.code,
      kind: 'tuition',
      amount: TUITION[level.cycle] + (TUITION_BONUS[level.code] ?? 0),
      installments: 3,
      optional: false,
    },
    { levelCode: level.code, kind: 'canteen', amount: 90_000, installments: 3, optional: true },
    { levelCode: level.code, kind: 'transport', amount: 120_000, installments: 3, optional: true },
  ]
  if (level.cycle !== 'daycare') {
    fees.push({
      levelCode: level.code,
      kind: 'daycare',
      amount: 60_000,
      installments: 3,
      optional: true,
    })
  }
  return fees
}

const DUE_DATES = ['2026-10-05', '2027-01-11', '2027-04-12']

export const FEE_LABELS: Record<FeeKind, string> = {
  registration: 'Inscription',
  tuition: 'Scolarité',
  canteen: 'Cantine',
  transport: 'Transport',
  daycare: 'Garderie du soir',
}

/** Échéances d'un élève selon la grille de frais de son niveau et ses options. */
export function installmentsFor(
  student: DemoStudent,
  fees: DemoFee[],
  levelCode: string,
): DemoInstallment[] {
  const result: DemoInstallment[] = []
  for (const fee of fees.filter((candidate) => candidate.levelCode === levelCode)) {
    if (fee.optional && !student.options.includes(fee.kind)) continue
    if (fee.installments === 1) {
      result.push({
        id: `${student.id}-${fee.kind}`,
        studentId: student.id,
        kind: fee.kind,
        label: FEE_LABELS[fee.kind],
        dueDate: student.enrolledAt,
        amount: fee.amount,
      })
      continue
    }
    const share = Math.floor(fee.amount / fee.installments)
    for (let index = 0; index < fee.installments; index += 1) {
      const last = index === fee.installments - 1
      result.push({
        id: `${student.id}-${fee.kind}-${String(index + 1)}`,
        studentId: student.id,
        kind: fee.kind,
        label: `${FEE_LABELS[fee.kind]} — échéance ${String(index + 1)}`,
        dueDate: DUE_DATES[index] ?? YEAR_START,
        amount: last ? fee.amount - share * (fee.installments - 1) : share,
      })
    }
  }
  return result
}

function weightedPick<T>(random: Random, items: readonly [T, number][]): T {
  const total = items.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = random.next() * total
  for (const [item, weight] of items) {
    roll -= weight
    if (roll <= 0) return item
  }
  const last = items[items.length - 1]
  if (last === undefined) throw new Error('Liste vide')
  return last[0]
}

/**
 * Rattache les comptes du seeder de démonstration aux données : « Kouadio Parent » (+2250700000008) devient le
 * parent payeur de quelques enfants, « Fatou Enseignante » (+2250700000007) la titulaire de deux classes de primaire.
 * Aucun tirage aléatoire : le reste des données est inchangé.
 */
export const DEMO_PARENT = { name: 'Kouadio Parent', phone: '+2250700000008' } as const
export const DEMO_TEACHER = { name: 'Fatou Enseignante', phone: '+2250700000007' } as const

const LINKS: Record<string, { children: string[]; teacherOf: string[] }> = {
  'les-lauriers': {
    children: ['lau-ce1-a', 'lau-creche-a'],
    teacherOf: ['lau-ce1-a', 'lau-cm1-a'],
  },
  'petits-genies': { children: ['pge-ps-a'], teacherOf: [] },
}

function linkDemoAccounts(
  slug: string,
  classrooms: DemoClassroom[],
  students: DemoStudent[],
): void {
  const links = LINKS[slug]
  if (links === undefined) return
  for (const classroomId of links.children) {
    const child = students.find((student) => student.classroomId === classroomId)
    if (child === undefined) continue
    const mother = child.guardians.find((guardian) => guardian.relation === 'Mère')
    child.lastName = 'Kouadio'
    child.guardians = [
      {
        id: `${child.id}-g1`,
        name: DEMO_PARENT.name,
        relation: 'Père',
        phone: DEMO_PARENT.phone,
        profession: 'Comptable',
        isPayer: true,
      },
      ...(mother === undefined
        ? []
        : [
            {
              ...mother,
              id: `${child.id}-g2`,
              name: `${mother.name.split(' ')[0] ?? 'Adjoua'} Kouadio`,
              isPayer: false,
            },
          ]),
    ]
  }
  for (const classroom of classrooms) {
    if (links.teacherOf.includes(classroom.id)) {
      classroom.teacher = `Mme ${DEMO_TEACHER.name}`
      classroom.teacherPhone = DEMO_TEACHER.phone
    }
  }
}

/** Génère les données d'une école (déterministes pour un slug et une date du jour). */
export function generateSchool(slug: string, now: Date = new Date()): DemoSchool {
  const template = TEMPLATES[slug] ?? TEMPLATES['les-lauriers']
  if (template === undefined) throw new Error('Gabarit de démonstration manquant')
  const random = createRandom(seedFrom(slug))
  const today = demoToday(now)

  const levels = LEVELS.filter((level) =>
    template.classes.some((entry) => entry.level === level.code),
  )
  const cycles = [...new Set(levels.map((level) => level.cycle))]
  const fees = levels.flatMap(feesFor)

  const classrooms: DemoClassroom[] = []
  const students: DemoStudent[] = []
  let matricule = 0

  for (const entry of template.classes) {
    const level = levels.find((candidate) => candidate.code === entry.level)
    if (level === undefined) continue
    for (const section of entry.sections) {
      const classroom: DemoClassroom = {
        id: `${template.code.toLowerCase()}-${level.code.toLowerCase()}-${section.toLowerCase()}`,
        name: `${level.code === 'CRECHE' ? 'Crèche' : level.code} ${section}`,
        levelCode: level.code,
        cycle: level.cycle,
        capacity: level.cycle === 'daycare' ? 14 : level.cycle === 'kindergarten' ? 24 : 30,
        teacher: teacherName(random),
        teacherPhone: null,
        room: `Salle ${String(classrooms.length + 1)}`,
      }
      classrooms.push(classroom)
      const size = random.int(entry.size[0], entry.size[1])
      for (let index = 0; index < size; index += 1) {
        matricule += 1
        const gender = random.chance(0.5) ? 'F' : 'M'
        const lastName = random.pick(FAMILY_NAMES)
        const id = `${template.code.toLowerCase()}-el-${pad(matricule, 4)}`
        const age = AGE[level.code] ?? 6
        const birth = `${String(2026 - age)}-${pad(random.int(1, 12), 2)}-${pad(random.int(1, 28), 2)}`
        const options: FeeKind[] = []
        if (random.chance(0.55)) options.push('canteen')
        if (random.chance(0.25)) options.push('transport')
        if (level.cycle !== 'daycare' && random.chance(0.15)) options.push('daycare')
        students.push({
          id,
          matricule: `${template.code}-2026-${pad(matricule, 4)}`,
          firstName: gender === 'F' ? random.pick(GIRL_NAMES) : random.pick(BOY_NAMES),
          lastName,
          gender,
          birthDate: birth,
          classroomId: classroom.id,
          district: random.pick(DISTRICTS),
          enrolledAt: addDays('2026-08-24', random.int(0, 24)),
          status: 'enrolled',
          medicalNote: random.chance(0.08) ? random.pick(MEDICAL_NOTES) : null,
          guardians: guardiansFor(random, lastName, id),
          options,
        })
      }
    }
  }

  linkDemoAccounts(slug, classrooms, students)

  // Échéances et paiements : la plupart à jour, certains en retard (impayés réalistes)
  const installments: DemoInstallment[] = []
  const payments: DemoPayment[] = []
  const pendingPayments: Omit<DemoPayment, 'id' | 'receiptNumber'>[] = []
  const cashiers = [`${random.pick(ADULT_FEMALE)} ${random.pick(FAMILY_NAMES)}`, 'Moussa Comptable']

  for (const student of students) {
    const classroom = classrooms.find((candidate) => candidate.id === student.classroomId)
    if (classroom === undefined) continue
    const own = installmentsFor(student, fees, classroom.levelCode)
    installments.push(...own)
    const profile = weightedPick(random, [
      ['ahead', 0.25],
      ['ontime', 0.45],
      ['late', 0.22],
      ['none', 0.08],
    ] as const)
    for (const installment of own) {
      if (installment.dueDate > addDays(today, profile === 'ahead' ? 120 : 0)) continue
      if (profile === 'none' && installment.kind !== 'registration') continue
      if (profile === 'late' && installment.kind !== 'registration' && random.chance(0.6)) continue
      const partial = profile === 'late' && random.chance(0.4)
      const amount = partial ? Math.round(installment.amount / 2 / 5000) * 5000 : installment.amount
      const lead = random.int(0, 12)
      const paidAt =
        installment.dueDate > today
          ? addDays(today, -random.int(0, 30))
          : addDays(installment.dueDate, -lead)
      const day =
        paidAt < YEAR_START && installment.kind !== 'registration'
          ? addDays(YEAR_START, random.int(0, 20))
          : paidAt
      const method = random.pick(PAYMENT_METHODS)
      pendingPayments.push({
        studentId: student.id,
        amount,
        method,
        paidAt: at(
          day > today ? today : day,
          `${pad(random.int(7, 16), 2)}:${pad(random.int(0, 59), 2)}`,
        ),
        cashier: random.pick(cashiers),
        reference:
          method === 'cash'
            ? null
            : method === 'cheque'
              ? `CHQ ${String(random.int(1_000_000, 9_999_999))}`
              : `MP${String(random.int(10_000_000, 99_999_999))}`,
      })
    }
  }
  // Quelques encaissements du jour, pour la caisse
  for (let index = 0; index < 6; index += 1) {
    const student = random.pick(students)
    pendingPayments.push({
      studentId: student.id,
      amount: random.pick([25_000, 30_000, 50_000, 90_000, 100_000]),
      method: random.pick(PAYMENT_METHODS),
      paidAt: at(today, `${pad(7 + index, 2)}:${pad(random.int(0, 59), 2)}`),
      cashier: random.pick(cashiers),
      reference: null,
    })
  }
  pendingPayments.sort((a, b) => a.paidAt.localeCompare(b.paidAt))
  pendingPayments.forEach((payment, index) => {
    payments.push({
      ...payment,
      id: `pay-${template.code.toLowerCase()}-${pad(index + 1, 5)}`,
      receiptNumber: `REC-2026-${pad(index + 1, 6)}`,
    })
  })

  // Notes du 1er trimestre (primaire) : deux évaluations par matière, quelques absences
  const primaryClasses = classrooms.filter((classroom) => classroom.cycle === 'primary')
  const subjects = cycles.includes('primary') ? PRIMARY_SUBJECTS : []
  const assessments: DemoAssessment[] = []
  const grades: DemoGrade[] = []
  for (const classroom of primaryClasses) {
    const pupils = students.filter((student) => student.classroomId === classroom.id)
    for (const subject of subjects) {
      for (const [index, date] of ['2026-10-09', '2026-10-27'].entries()) {
        const assessment: DemoAssessment = {
          id: `${classroom.id}-${subject.code.toLowerCase()}-${String(index + 1)}`,
          classroomId: classroom.id,
          subjectCode: subject.code,
          term: 1,
          title: index === 0 ? 'Évaluation 1' : 'Évaluation 2',
          date,
          outOf: 20,
        }
        if (date > today) continue
        assessments.push(assessment)
        for (const pupil of pupils) {
          const ability = (seedFrom(pupil.id) % 9) + 8
          const value = random.chance(0.03)
            ? null
            : Math.max(
                2,
                Math.min(20, ability + random.int(-3, 3) + (random.chance(0.5) ? 0.5 : 0)),
              )
          grades.push({ assessmentId: assessment.id, studentId: pupil.id, value })
        }
      }
    }
  }

  // Compétences de maternelle (1er trimestre, partiellement évaluées)
  const skills = cycles.includes('kindergarten') ? KINDERGARTEN_SKILLS : []
  const skillEvaluations: DemoSkillEvaluation[] = []
  for (const student of students) {
    const classroom = classrooms.find((candidate) => candidate.id === student.classroomId)
    if (classroom?.cycle !== 'kindergarten') continue
    for (const skill of skills) {
      const level: SkillLevel | null = random.chance(0.2)
        ? null
        : weightedPick(random, [
            ['A', 0.5],
            ['EA', 0.38],
            ['NA', 0.12],
          ] as const)
      skillEvaluations.push({ skillId: skill.id, studentId: student.id, term: 1, level })
    }
  }

  // Présences : du début d'année à aujourd'hui ; aujourd'hui, appel fait dans une partie des classes
  const days = schoolDays(YEAR_START, today, HOLIDAYS)
  const attendance: DemoAttendance[] = []
  const calledToday = new Set(
    classrooms.filter((_, index) => index % 3 !== 2).map((classroom) => classroom.id),
  )
  for (const student of students) {
    const fragile = random.chance(0.1)
    for (const date of days) {
      if (date === today && !calledToday.has(student.classroomId)) continue
      const status: AttendanceStatus = weightedPick(random, [
        ['present', fragile ? 0.85 : 0.955],
        ['absent', fragile ? 0.1 : 0.025],
        ['late', 0.015],
        ['excused', 0.005],
      ] as const)
      if (status === 'present') continue
      attendance.push({
        studentId: student.id,
        date,
        status,
        justified: status === 'excused' || random.chance(0.5),
      })
    }
  }

  const rollCalls: DemoRollCall[] = days.flatMap((date) =>
    classrooms
      .filter((classroom) => date !== today || calledToday.has(classroom.id))
      .map((classroom) => ({
        classroomId: classroom.id,
        date,
        takenBy: classroom.teacher,
        takenAt: at(date, '07:55'),
      })),
  )

  // Garderie : arrivées, départs et journal du jour pour la crèche
  const daycareVisits: DemoDaycareVisit[] = []
  const daycareLogs: DemoDaycareLog[] = []
  const toddlers = students.filter(
    (student) =>
      classrooms.find((classroom) => classroom.id === student.classroomId)?.cycle === 'daycare',
  )
  for (const child of toddlers) {
    const absentToday = attendance.some(
      (entry) => entry.studentId === child.id && entry.date === today && entry.status === 'absent',
    )
    if (absentToday) continue
    const guardian = child.guardians[0]?.name ?? null
    daycareVisits.push({
      studentId: child.id,
      date: today,
      arrivedAt: at(today, `0${String(random.int(6, 8))}:${pad(random.int(0, 59), 2)}`),
      leftAt: random.chance(0.15)
        ? at(today, `1${String(random.int(5, 7))}:${pad(random.int(0, 59), 2)}`)
        : null,
      droppedBy: guardian,
      pickedUpBy: null,
    })
    const entries: [string, DemoDaycareLog['kind'], string][] = [
      [
        '08:30',
        'meal',
        random.pick([
          'Bouillie de mil, tout mangé',
          'Bouillie, la moitié',
          'Pain et lait, bien mangé',
        ]),
      ],
      [
        '09:30',
        'activity',
        random.pick(['Jeux de construction', 'Comptines et danse', 'Peinture avec les doigts']),
      ],
      ['10:15', 'diaper', 'Change, RAS'],
      [
        '12:00',
        'meal',
        random.pick([
          'Riz sauce graine, tout mangé',
          'Purée d’igname et poisson, un peu',
          'Attiéké poisson, bien mangé',
        ]),
      ],
      [
        '13:00',
        'nap',
        random.pick(['Sieste de 13 h à 14 h 45', 'Sieste agitée, 1 h', 'Belle sieste de 2 h']),
      ],
      ['15:30', 'mood', random.pick(['Joyeux et calme', 'Un peu fatigué', 'Très en forme'])],
    ]
    entries.forEach(([time, kind, note], index) => {
      daycareLogs.push({
        id: `${child.id}-log-${String(index)}`,
        studentId: child.id,
        date: today,
        time,
        kind,
        note,
      })
    })
  }

  // Messages avec les familles
  const conversations: DemoConversation[] = []
  const subjectsList = [
    'Retard du matin',
    'Rendez-vous avec l’enseignante',
    'Médicament à donner à midi',
    'Paiement de la 2e échéance',
    'Sortie pédagogique',
    'Absence de vendredi',
  ]
  for (let index = 0; index < 8; index += 1) {
    const student = random.pick(students)
    const guardian = student.guardians[0]
    if (guardian === undefined) continue
    const subject = subjectsList[index % subjectsList.length] ?? 'Message'
    const sentAt = at(
      addDays(today, -index),
      `${pad(random.int(7, 18), 2)}:${pad(random.int(0, 59), 2)}`,
    )
    conversations.push({
      id: `conv-${String(index + 1)}`,
      studentId: student.id,
      guardianName: guardian.name,
      guardianPhone: guardian.phone,
      subject,
      unread: index < 3 ? random.int(1, 2) : 0,
      messages: [
        {
          id: `conv-${String(index + 1)}-1`,
          from: 'guardian',
          author: guardian.name,
          body: `Bonjour, je vous écris au sujet de ${student.firstName} : ${subject.toLowerCase()}. Merci de me tenir informé(e).`,
          sentAt,
        },
        ...(index >= 3
          ? [
              {
                id: `conv-${String(index + 1)}-2`,
                from: 'school' as const,
                author: 'Secrétariat',
                body: 'Bonjour, c’est bien noté. Nous revenons vers vous rapidement. Bonne journée !',
                sentAt: new Date(Date.parse(sentAt) + 3_600_000)
                  .toISOString()
                  .replace('.000Z', 'Z'),
              },
            ]
          : []),
      ],
    })
  }

  // Une conversation pour chaque enfant du parent de démonstration
  students
    .filter((student) => student.guardians.some((guardian) => guardian.phone === DEMO_PARENT.phone))
    .forEach((student, index) => {
      conversations.unshift({
        id: `conv-parent-${String(index + 1)}`,
        studentId: student.id,
        guardianName: DEMO_PARENT.name,
        guardianPhone: DEMO_PARENT.phone,
        subject: index === 0 ? 'Devoirs de la semaine' : 'Sieste et repas',
        unread: 0,
        messages: [
          {
            id: `conv-parent-${String(index + 1)}-1`,
            from: 'school',
            author: index === 0 ? `Mme ${DEMO_TEACHER.name}` : 'Garderie',
            body:
              index === 0
                ? `Bonjour M. Kouadio, ${student.firstName} a bien progressé en lecture cette semaine. Pensez à réviser la table de 3.`
                : `Bonjour, ${student.firstName} a bien mangé et a fait une belle sieste aujourd’hui.`,
            sentAt: at(addDays(today, -1), '16:10'),
          },
          {
            id: `conv-parent-${String(index + 1)}-2`,
            from: 'guardian',
            author: DEMO_PARENT.name,
            body: 'Merci beaucoup pour ces nouvelles, bonne soirée !',
            sentAt: at(addDays(today, -1), '18:42'),
          },
        ],
      })
    })

  const announcements: DemoAnnouncement[] = [
    {
      id: 'ann-1',
      title: 'Réunion des parents d’élèves',
      body: 'Chers parents, la réunion de rentrée se tiendra samedi à 9 h dans la cour principale. Votre présence est vivement souhaitée.',
      audience: 'all',
      channels: ['app', 'sms'],
      sentAt: at(addDays(today, -6), '10:00'),
      author: 'Direction',
      reach: students.length,
    },
    {
      id: 'ann-2',
      title: 'Vaccination à la crèche',
      body: 'Une campagne de vaccination aura lieu mardi. Merci d’apporter le carnet de santé de votre enfant.',
      audience: 'daycare',
      channels: ['app', 'sms'],
      sentAt: at(addDays(today, -12), '08:15'),
      author: 'Infirmerie',
      reach: toddlers.length,
    },
    {
      id: 'ann-3',
      title: 'Rappel : 2e échéance de scolarité',
      body: 'La 2e échéance de scolarité est attendue avant le 11 janvier. Paiement possible au guichet ou par Mobile Money.',
      audience: 'all',
      channels: ['app'],
      sentAt: at(addDays(today, -2), '16:30'),
      author: 'Comptabilité',
      reach: students.length,
    },
  ]

  const month = today.slice(0, 7)
  const allEvents: DemoEvent[] = [
    {
      id: 'ev-1',
      title: 'Vacances de Toussaint',
      kind: 'holiday',
      start: '2026-10-30',
      end: '2026-11-02',
      cycle: null,
      location: null,
    },
    {
      id: 'ev-2',
      title: 'Réunion des parents',
      kind: 'meeting',
      start: `${month}-14`,
      end: `${month}-14`,
      cycle: null,
      location: 'Cour principale',
    },
    {
      id: 'ev-3',
      title: 'Évaluations du 1er trimestre',
      kind: 'exam',
      start: '2026-12-07',
      end: '2026-12-11',
      cycle: 'primary',
      location: null,
    },
    {
      id: 'ev-4',
      title: 'Fête de Noël',
      kind: 'event',
      start: '2026-12-18',
      end: '2026-12-18',
      cycle: null,
      location: 'Préau',
    },
    {
      id: 'ev-5',
      title: 'Vacances de Noël',
      kind: 'holiday',
      start: '2026-12-19',
      end: '2027-01-04',
      cycle: null,
      location: null,
    },
    {
      id: 'ev-6',
      title: 'Journée pédagogique (pas de classe)',
      kind: 'training',
      start: `${month}-20`,
      end: `${month}-20`,
      cycle: null,
      location: null,
    },
    {
      id: 'ev-7',
      title: 'Sortie au zoo d’Abidjan',
      kind: 'event',
      start: `${month}-26`,
      end: `${month}-26`,
      cycle: 'kindergarten',
      location: 'Zoo national',
    },
    {
      id: 'ev-8',
      title: 'Visite médicale',
      kind: 'event',
      start: `${month}-10`,
      end: `${month}-10`,
      cycle: 'daycare',
      location: 'Infirmerie',
    },
  ]
  const events = allEvents.filter((event) => event.cycle === null || cycles.includes(event.cycle))

  const staff: DemoStaff[] = [
    {
      id: 'st-1',
      name: slug === 'petits-genies' ? 'Mariam Directrice' : 'Yao Directeur',
      phone: slug === 'petits-genies' ? '+2250700000009' : '+2250700000003',
      email: null,
      roles: [{ role: 'director', cycle: null }],
      lastLoginAt: at(today, '07:45'),
    },
    {
      id: 'st-2',
      name: 'Awa Secrétaire',
      phone: '+2250700000005',
      email: 'secretaire@demo.lecolso.ci',
      roles: [{ role: 'secretary', cycle: null }],
      lastLoginAt: at(today, '07:58'),
    },
    {
      id: 'st-3',
      name: 'Moussa Comptable',
      phone: '+2250700000006',
      email: 'comptable@demo.lecolso.ci',
      roles: [{ role: 'accountant', cycle: null }],
      lastLoginAt: at(addDays(today, -1), '16:20'),
    },
    ...(cycles.includes('kindergarten')
      ? [
          {
            id: 'st-4',
            name: 'Aminata Directrice maternelle',
            phone: '+2250700000004',
            email: null,
            roles: [{ role: 'director' as const, cycle: 'kindergarten' as const }],
            lastLoginAt: at(addDays(today, -2), '09:10'),
          },
        ]
      : []),
    ...classrooms.slice(0, 6).map((classroom, index) => ({
      id: `st-t${String(index + 1)}`,
      name: classroom.teacher.replace(/^(Mme|M\.) /, ''),
      phone: phone(random),
      email: null,
      roles: [{ role: 'teacher' as const, cycle: classroom.cycle }],
      lastLoginAt: index % 3 === 0 ? null : at(addDays(today, -index), '07:30'),
    })),
  ]

  const activity: DemoActivity[] = [
    ...payments.slice(-6).map((payment) => ({
      id: `act-${payment.id}`,
      at: payment.paidAt,
      kind: 'payment' as const,
      label: payment.receiptNumber,
      studentId: payment.studentId,
    })),
    ...attendance
      .filter((entry) => entry.date === today && entry.status === 'absent')
      .slice(0, 4)
      .map((entry, index) => ({
        id: `act-abs-${String(index)}`,
        at: at(today, `08:${pad(index * 7 + 5, 2)}`),
        kind: 'absence' as const,
        label: '',
        studentId: entry.studentId,
      })),
    ...students.slice(-2).map((student, index) => ({
      id: `act-enr-${String(index)}`,
      at: at(addDays(today, -1), `1${String(index)}:30`),
      kind: 'enrollment' as const,
      label: '',
      studentId: student.id,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  return {
    key: slug,
    name: template.name,
    address: template.address,
    phone: template.phone,
    email: template.email,
    motto: template.motto,
    year: YEAR_LABEL,
    cycles,
    levels,
    classrooms,
    students,
    fees,
    installments,
    payments,
    subjects,
    assessments,
    grades,
    skills,
    skillEvaluations,
    attendance,
    rollCalls,
    daycareVisits,
    daycareLogs,
    conversations,
    announcements,
    events,
    staff,
    activity,
    receiptSequence: payments.length,
  }
}
