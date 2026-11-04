import { useTranslation } from 'react-i18next'

import { LogoMark } from '@/components/brand/Logo'
import { formatAverage, formatDay, formatRank } from '@/lib/format'
import { cn } from '@/lib/utils'

import { appreciation, type ReportCardData } from '../demo'

/**
 * Bulletin ou livret au format A4, toujours sur fond blanc (aperçu fidèle à l'impression).
 * Le PDF définitif sera rendu côté serveur (Gotenberg) à partir du gabarit du cycle.
 */
export function ReportDocument({ data, termLabel }: { data: ReportCardData; termLabel: string }) {
  const { t } = useTranslation()
  const levelTone = { A: 'text-[#166534]', EA: 'text-[#a14a07]', NA: 'text-[#b91c1c]' } as const

  return (
    <article data-print-document className="mx-auto grid w-full max-w-[210mm] gap-5 bg-white p-6 text-[#1b2559] sm:p-10">
      <header className="flex items-start justify-between gap-4 border-b-2 border-[#1b2559] pb-4">
        <div className="flex items-center gap-3">
          <LogoMark className="size-12" />
          <div>
            <p className="font-display text-xl font-bold">{data.school.name}</p>
            <p className="text-sm text-[#5c544a]">{data.school.address}</p>
            <p className="text-sm text-[#5c544a] italic">{data.school.motto}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="font-display text-lg font-bold uppercase">
            {t(data.kind === 'report_card' ? 'reportCards.reportCard' : 'reportCards.skillsBooklet')}
          </h2>
          <p className="font-semibold">{termLabel}</p>
          <p className="text-sm text-[#5c544a]">{data.school.year}</p>
        </div>
      </header>

      <section className="grid gap-1 rounded-xl bg-[#fbf8f3] p-4 sm:grid-cols-2">
        <p className="font-display text-lg font-bold sm:col-span-2">{data.name}</p>
        <p className="text-sm">{t('reportCards.born', { date: formatDay(data.student.birthDate) })}</p>
        <p className="text-sm">
          {data.classroom} · {data.student.matricule}
        </p>
        <p className="text-sm">{t('reportCards.classSize', { count: data.classSize })}</p>
        <p className="text-sm">{t('reportCards.absences', { count: data.absences })}</p>
      </section>

      {data.kind === 'report_card' ? (
        <>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#1b2559] text-white">
                <th className="px-3 py-2 text-left">{t('grades.subject')}</th>
                <th className="px-3 py-2 text-center">{t('students.detail.coefficient')}</th>
                <th className="px-3 py-2 text-center">{t('grades.average')}</th>
                <th className="px-3 py-2 text-left">{t('reportCards.appreciation')}</th>
              </tr>
            </thead>
            <tbody>
              {data.subjects.map((subject) => {
                const value = data.results?.bySubject[subject.code] ?? null
                return (
                  <tr key={subject.code} className="border-b border-[#e8e1d6]">
                    <td className="px-3 py-2 font-medium">{subject.name}</td>
                    <td className="px-3 py-2 text-center">{subject.coefficient}</td>
                    <td className={cn('px-3 py-2 text-center font-semibold tabular', value !== null && value < 10 && 'text-[#b91c1c]')}>
                      {formatAverage(value)}
                    </td>
                    <td className="px-3 py-2 text-[#5c544a]">{appreciation(value)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#e8e1d6] p-3 text-center">
              <p className="text-xs font-semibold text-[#5c544a] uppercase">{t('grades.generalAverage')}</p>
              <p className="font-display text-3xl font-bold tabular">{formatAverage(data.results?.average ?? null)}</p>
            </div>
            <div className="rounded-xl border border-[#e8e1d6] p-3 text-center">
              <p className="text-xs font-semibold text-[#5c544a] uppercase">{t('grades.rank')}</p>
              <p className="font-display text-3xl font-bold">
                {formatRank(data.results?.rank ?? null)}
                <span className="text-sm font-medium"> / {data.classSize}</span>
              </p>
            </div>
            <div className="rounded-xl border border-[#e8e1d6] p-3 text-center">
              <p className="text-xs font-semibold text-[#5c544a] uppercase">{t('reportCards.appreciation')}</p>
              <p className="text-sm font-medium">{appreciation(data.results?.average ?? null)}</p>
            </div>
          </section>
          <p className="text-sm text-[#5c544a]">{t('grades.classAverage', { value: formatAverage(data.classAverage) })}</p>
        </>
      ) : (
        <div className="grid gap-4">
          {[...new Set(data.skills.map((skill) => skill.domain))].map((domain) => (
            <section key={domain} className="grid gap-1">
              <h3 className="font-display font-bold">{domain}</h3>
              <ul className="grid gap-1">
                {data.skills
                  .filter((skill) => skill.domain === domain)
                  .map((skill) => (
                    <li key={skill.label} className="flex items-center justify-between gap-3 border-b border-[#e8e1d6] py-1.5 text-sm">
                      <span>{skill.label}</span>
                      <span className={cn('font-semibold', skill.level === null ? 'text-[#5c544a]' : levelTone[skill.level])}>
                        {t(`skillLevels.${skill.level ?? 'none'}`)}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <footer className="grid grid-cols-3 gap-4 pt-4 text-center text-xs font-semibold text-[#5c544a] uppercase">
        {(['teacher', 'director', 'parents'] as const).map((who) => (
          <div key={who} className="grid gap-2">
            <span>{t(`reportCards.${who}`)}</span>
            <span className="h-14 rounded-lg border border-dashed border-[#d9d0c2]" />
          </div>
        ))}
      </footer>
    </article>
  )
}
