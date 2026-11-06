import { useTranslation } from 'react-i18next'

import { ScreenHeader } from '@/components/ScreenHeader'
import { QueryState } from '@/components/states/QueryState'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AcademicYearsPanel } from '@/features/academic/components/AcademicYearsPanel'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { useCycles } from '@/features/cycles/api'
import { GradingSettingsPanel } from '@/features/grades/components/GradingSettingsPanel'
import { useSchoolProfile } from '@/features/school/api'
import { SchoolIdentityForm } from '@/features/school/components/SchoolIdentityForm'

import { CycleSettingsForm } from './CycleSettingsForm'

/** Paramètres de l'école : identité et logo, années scolaires, cycles (vraie API). Utilisateurs et rôles : écrans dédiés. */
export function SettingsPage() {
  const { t } = useTranslation()
  const school = useCurrentSchool()
  const profile = useSchoolProfile()
  const cycles = useCycles()
  const manage = school?.permissions['school.settings.manage']

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('settings.title')}
        description={t('settings.description')}
        demo={false}
      />
      <Tabs defaultValue="identity" className="min-w-0">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="identity">{t('settings.tabs.identity')}</TabsTrigger>
            <TabsTrigger value="years">{t('settings.tabs.years')}</TabsTrigger>
            <TabsTrigger value="cycles">{t('settings.tabs.cycles')}</TabsTrigger>
            <TabsTrigger value="grading">{t('settings.tabs.grading')}</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="identity" className="mt-4 grid gap-3">
          <QueryState query={profile}>
            {(data) => (
              <SchoolIdentityForm
                key={data.id}
                profile={data}
                editable={school?.permissions['school.settings.manage'] === null}
              />
            )}
          </QueryState>
        </TabsContent>
        <TabsContent value="years" className="mt-4">
          <AcademicYearsPanel editable={manage === null} />
        </TabsContent>
        <TabsContent value="cycles" className="mt-4 grid gap-4">
          <p className="text-sm text-muted-foreground">{t('settings.cycles.realApi')}</p>
          <QueryState query={cycles}>
            {(list) => (
              <div className="grid gap-4">
                {list.map((cycle) => (
                  <CycleSettingsForm
                    key={cycle.id}
                    cycle={cycle}
                    editable={manage === null || manage?.includes(cycle.id) === true}
                  />
                ))}
              </div>
            )}
          </QueryState>
        </TabsContent>
        <TabsContent value="grading" className="mt-4">
          <QueryState query={cycles}>{(list) => <GradingSettingsPanel cycles={list} />}</QueryState>
        </TabsContent>
      </Tabs>
    </div>
  )
}
