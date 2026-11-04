import { Search, Trash2, UserPlus } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe } from '@/features/auth/api'
import { useRoleLabel } from '@/features/auth/roles'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { useCycles } from '@/features/cycles/api'
import { usePermissionCatalog, useSchoolRoles } from '@/features/roles/api'
import { formatDateTime, formatPhone } from '@/lib/format'
import { toast } from '@/lib/toast'

import { useRemoveUser, useSchoolUsers, type SchoolUser, type UserStatus } from '../api'

import { CreateUserSheet } from './CreateUserSheet'
import { UserSheet } from './UserSheet'

const STATUSES: UserStatus[] = ['all', 'active', 'deactivated']

function ListSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-20" />
      ))}
    </div>
  )
}

/** Comptes de l'établissement (vraie API) : recherche, filtres, ajout, fiche de gestion en panneau latéral. */
export function UsersPage() {
  const { t } = useTranslation()
  const school = useCurrentSchool()
  const me = useMe()
  const roleLabel = useRoleLabel()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<string | null>(null)
  const [status, setStatus] = useState<UserStatus>('all')
  const deferredSearch = useDeferredValue(search)
  const users = useSchoolUsers({ search: deferredSearch, role, status })
  const roles = useSchoolRoles()
  const catalog = usePermissionCatalog()
  const cycles = useCycles()
  const remove = useRemoveUser()
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<SchoolUser | null>(null)
  const [toRemove, setToRemove] = useState<SchoolUser | null>(null)
  const canCreate = school !== null && Object.hasOwn(school.permissions, 'users.manage')
  const list = users.data?.pages.flatMap((page) => page.data) ?? []
  const ready = roles.data !== undefined && catalog.data !== undefined && cycles.data !== undefined

  const cycleName = (cycleId: string | null) =>
    cycleId === null
      ? t('usersAdmin.wholeSchool')
      : (cycles.data?.find((cycle) => cycle.id === cycleId)?.name ?? '')

  const confirmRemove = async () => {
    if (toRemove === null) return
    const name = toRemove.name
    try {
      const erased = await remove.mutateAsync(toRemove.id)
      toast(
        erased
          ? t('usersAdmin.removeDialog.erased', { name })
          : t('usersAdmin.removeDialog.detached', { name }),
        { tone: 'success' },
      )
      setSelected(null)
    } catch {
      toast(t('usersAdmin.sheet.failed'), { tone: 'error' })
    } finally {
      setToRemove(null)
    }
  }

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('usersAdmin.title')}
        description={t('usersAdmin.description')}
        demo={false}
        actions={
          canCreate && (
            <Button
              variant="accent"
              disabled={!ready}
              onClick={() => {
                setCreating(true)
              }}
            >
              <UserPlus aria-hidden />
              {t('usersAdmin.create')}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_14rem_12rem]">
        <div className="grid gap-2">
          <Label htmlFor="users-search">{t('usersAdmin.searchLabel')}</Label>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="users-search"
              type="search"
              className="pl-10"
              placeholder={t('usersAdmin.searchPlaceholder')}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
              }}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="users-role">{t('usersAdmin.roleFilter')}</Label>
          <NativeSelect
            id="users-role"
            value={role ?? ''}
            onChange={(event) => {
              setRole(event.target.value === '' ? null : event.target.value)
            }}
          >
            <option value="">{t('usersAdmin.allRoles')}</option>
            {(roles.data ?? []).map((option) => (
              <option key={option.key} value={option.key}>
                {roleLabel({ role: option.key, name: option.name })}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="users-status">{t('usersAdmin.statusFilter')}</Label>
          <NativeSelect
            id="users-status"
            value={status}
            onChange={(event) => {
              setStatus(STATUSES.find((value) => value === event.target.value) ?? 'all')
            }}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`usersAdmin.status.${value}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {users.isError ? (
        <ErrorState
          onRetry={() => {
            void users.refetch()
          }}
        />
      ) : users.data === undefined ? (
        <ListSkeleton />
      ) : list.length === 0 ? (
        <EmptyState
          title={t('usersAdmin.emptyTitle')}
          description={t('usersAdmin.emptyDescription')}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3">
          {list.map((user) => (
            <li key={user.id}>
              <Card className="py-0">
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={user.name} />
                    <div className="grid min-w-0 gap-0.5">
                      <h2 className="flex flex-wrap items-center gap-2 font-semibold">
                        <span className="break-words">{user.name}</span>
                        {me.data?.id === user.id && (
                          <Badge variant="secondary">{t('usersAdmin.you')}</Badge>
                        )}
                        {!user.active && (
                          <Badge variant="destructive">{t('usersAdmin.deactivated')}</Badge>
                        )}
                      </h2>
                      <p className="tabular text-sm text-muted-foreground">
                        {formatPhone(user.phone)}
                        {' · '}
                        {user.last_login_at === null
                          ? t('usersAdmin.neverLoggedIn')
                          : t('usersAdmin.lastLogin', { date: formatDateTime(user.last_login_at) })}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {user.roles.map((assignment) => (
                          <Badge key={assignment.id} variant="outline">
                            {roleLabel({ role: assignment.role, name: assignment.role_name })}
                            {' · '}
                            {cycleName(assignment.cycle_id)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-start sm:self-center"
                    disabled={!ready}
                    aria-label={`${user.can_manage ? t('usersAdmin.manage') : t('usersAdmin.view')} : ${user.name}`}
                    onClick={() => {
                      setSelected(user)
                    }}
                  >
                    {user.can_manage ? t('usersAdmin.manage') : t('usersAdmin.view')}
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {users.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={users.isFetchingNextPage}
            onClick={() => {
              void users.fetchNextPage()
            }}
          >
            {t('usersAdmin.more')}
          </Button>
        </div>
      )}

      <Sheet
        open={creating || selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false)
            setSelected(null)
          }
        }}
      >
        <SheetContent
          side="right"
          closeLabel={t('common.close')}
          className="w-full max-w-xl gap-0 sm:w-[36rem]"
        >
          {ready && creating && (
            <CreateUserSheet
              roles={roles.data}
              catalog={catalog.data}
              cycles={cycles.data}
              onDone={() => {
                setCreating(false)
              }}
            />
          )}
          {ready && selected !== null && (
            <UserSheet
              key={selected.id}
              user={selected}
              roles={roles.data}
              catalog={catalog.data}
              cycles={cycles.data}
              onRemove={setToRemove}
            />
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={toRemove !== null}
        onOpenChange={(open) => {
          if (!open) setToRemove(null)
        }}
      >
        <DialogContent closeLabel={t('common.close')}>
          <DialogTitle>
            {toRemove !== null && t('usersAdmin.removeDialog.title', { name: toRemove.name })}
          </DialogTitle>
          <DialogDescription>{t('usersAdmin.removeDialog.description')}</DialogDescription>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => void confirmRemove()}
            >
              <Trash2 aria-hidden />
              {t('usersAdmin.removeDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
