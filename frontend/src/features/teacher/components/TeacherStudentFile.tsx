import { Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStudentFile } from '@/features/students/api'
import { formatDay, formatPhone } from '@/lib/format'

/**
 * Fiche d'un élève de la classe, en lecture seule : identité, parents à appeler, informations médicales (seulement si
 * l'API les renvoie : `students.medical.view`). Hors de ses classes : introuvable.
 */
export function TeacherStudentFile({ studentId }: { studentId: string }) {
  const { t } = useTranslation()
  const query = useStudentFile(studentId)

  return (
    <QueryState query={query}>
      {(student) =>
        student === null ? (
          <EmptyState title={t('teacher.students.notFound')} />
        ) : (
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={student.full_name} photoUrl={student.photo_url} size="lg" />
              <div className="grid">
                <h1 className="font-display text-2xl font-bold">{student.full_name}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('teacher.students.identity', {
                    date: formatDay(student.birth_date),
                    matricule: student.matricule,
                  })}
                </p>
              </div>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{t('teacher.students.parents')}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {student.guardians.map((guardian) => (
                  <div key={guardian.id} className="flex items-center gap-3">
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate font-medium">{guardian.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {t(`enrollment.relations.${guardian.relation}`)}
                        {guardian.can_pick_up ? ` · ${t('teacher.students.canPickUp')}` : ''}
                      </span>
                    </span>
                    <Button asChild variant="outline" size="lg">
                      <a
                        href={`tel:${guardian.phone}`}
                        aria-label={t('teacher.students.call', { name: guardian.name })}
                      >
                        <Phone aria-hidden />
                        {formatPhone(guardian.phone)}
                      </a>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
            {student.medical !== null && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('teacher.students.medical')}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-1 text-sm">
                  <p>
                    {t('teacher.students.allergies', {
                      value: student.medical.allergies ?? t('teacher.students.none'),
                    })}
                  </p>
                  <p>
                    {t('teacher.students.bloodType', {
                      value: student.medical.blood_type ?? t('teacher.students.unknown'),
                    })}
                  </p>
                  {student.medical.medical_notes !== null && <p>{student.medical.medical_notes}</p>}
                </CardContent>
              </Card>
            )}
          </div>
        )
      }
    </QueryState>
  )
}
