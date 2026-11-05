import { Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ScreenHeader } from '@/components/ScreenHeader'
import { DemoBanner } from '@/components/states/DemoBanner'
import { QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { can } from '@/features/auth/access'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { useCycles } from '@/features/cycles/api'
import { toast } from '@/lib/toast'

import { useSchoolIdentity, useUpdateIdentity } from '../api'
import type { SchoolIdentity } from '../demo'

import { CycleSettingsForm } from './CycleSettingsForm'

function IdentityForm({ identity, editable }: { identity: SchoolIdentity; editable: boolean }) {
  const { t } = useTranslation()
  const update = useUpdateIdentity()
  const [draft, setDraft] = useState(identity)
  const fields = ['name', 'address', 'phone', 'email', 'motto'] as const

  return (
    <Card>
      <CardContent className="pt-6">
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            void update.mutateAsync(draft).then(() => {
              toast(t('settings.identity.saved'), { tone: 'success' })
            })
          }}
        >
          {fields.map((field) => (
            <Field
              key={field}
              label={t(`settings.identity.${field}`)}
              className={field === 'address' || field === 'motto' ? 'md:col-span-2' : undefined}
            >
              {(control) => (
                <Input
                  {...control}
                  disabled={!editable}
                  value={draft[field]}
                  onChange={(event) => {
                    setDraft({ ...draft, [field]: event.target.value })
                  }}
                />
              )}
            </Field>
          ))}
          <Field label={t('settings.identity.year')}>
            {(control) => <Input {...control} disabled value={identity.year} />}
          </Field>
          {editable && (
            <div className="flex items-end justify-end">
              <Button type="submit" disabled={update.isPending}>
                <Save aria-hidden />
                {t('common.save')}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

/** Paramètres de l'école : identité (démo), cycles (vraie API). Utilisateurs et rôles : écrans dédiés. */
export function SettingsPage() {
  const { t } = useTranslation()
  const school = useCurrentSchool()
  const identity = useSchoolIdentity()
  const cycles = useCycles()
  const manage = school?.permissions['school.settings.manage']

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('settings.title')}
        description={t('settings.description')}
        demo={false}
      />
      <Tabs defaultValue="identity">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="identity">{t('settings.tabs.identity')}</TabsTrigger>
            <TabsTrigger value="cycles">{t('settings.tabs.cycles')}</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="identity" className="mt-4 grid gap-3">
          <DemoBanner />
          <QueryState query={identity}>
            {(data) => (
              <IdentityForm identity={data} editable={can(school, 'school.settings.manage')} />
            )}
          </QueryState>
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
      </Tabs>
    </div>
  )
}
