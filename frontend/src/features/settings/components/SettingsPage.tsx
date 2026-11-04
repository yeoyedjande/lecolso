import { Copy, KeyRound, Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ScreenHeader } from '@/components/ScreenHeader'
import { DemoBanner } from '@/components/states/DemoBanner'
import { QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { can } from '@/features/auth/access'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { useCycles } from '@/features/cycles/api'
import { formatDateTime, formatPhone } from '@/lib/format'
import type { DemoStaff } from '@/lib/demo/types'
import { toast } from '@/lib/toast'

import { useResetPassword, useSchoolIdentity, useStaff, useUpdateIdentity } from '../api'
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

function Users({ canReset }: { canReset: boolean }) {
  const { t } = useTranslation()
  const query = useStaff()
  const reset = useResetPassword()
  const [target, setTarget] = useState<DemoStaff | null>(null)
  const [password, setPassword] = useState<string | null>(null)

  return (
    <>
      <QueryState query={query}>
        {(staff) => (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings.users.name')}</TableHead>
                  <TableHead>{t('settings.users.roles')}</TableHead>
                  <TableHead>{t('settings.users.lastLogin')}</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">{t('common.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <span className="flex items-center gap-3">
                        <Avatar name={member.name} size="sm" />
                        <span className="grid">
                          <span className="font-medium">{member.name}</span>
                          <span className="tabular text-xs text-muted-foreground">
                            {formatPhone(member.phone)}
                          </span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1">
                        {member.roles.map((role, index) => (
                          <Badge key={index} variant="secondary">
                            {t(`roles.${role.role}`)} ·{' '}
                            {role.cycle === null
                              ? t('settings.users.wholeSchool')
                              : t(`cycles.${role.cycle}`)}
                          </Badge>
                        ))}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.lastLoginAt === null
                        ? t('settings.users.never')
                        : formatDateTime(member.lastLoginAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canReset && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t('settings.users.resetOf', { name: member.name })}
                          onClick={() => {
                            setPassword(null)
                            setTarget(member)
                          }}
                        >
                          <KeyRound aria-hidden />
                          {t('settings.users.reset')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </QueryState>
      <Dialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
      >
        <DialogContent closeLabel={t('common.close')}>
          <DialogTitle>{t('settings.users.resetTitle')}</DialogTitle>
          <DialogDescription>
            {target !== null && t('settings.users.resetDescription', { name: target.name })}
          </DialogDescription>
          {password !== null && target !== null && (
            <div className="grid gap-2 rounded-2xl bg-muted p-4">
              <p className="text-sm">{t('settings.users.resetDone', { name: target.name })}</p>
              <div className="flex items-center justify-between gap-3">
                <code className="font-display text-2xl font-bold tracking-wide">{password}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(password).then(() => {
                      toast(t('settings.users.copied'), { tone: 'success' })
                    })
                  }}
                >
                  <Copy aria-hidden />
                  {t('settings.users.copy')}
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">{t('common.close')}</Button>
            </DialogClose>
            {password === null && (
              <Button
                variant="accent"
                disabled={reset.isPending}
                onClick={() => {
                  if (target === null) return
                  void reset.mutateAsync(target.id).then(setPassword)
                }}
              >
                <KeyRound aria-hidden />
                {t('settings.users.resetConfirm')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Paramètres de l'école : identité (démo), cycles (vraie API), utilisateurs et rôles (démo). */
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
            <TabsTrigger value="users">{t('settings.tabs.users')}</TabsTrigger>
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
        <TabsContent value="users" className="mt-4 grid gap-3">
          <DemoBanner />
          <Users canReset={can(school, 'users.reset_password')} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
