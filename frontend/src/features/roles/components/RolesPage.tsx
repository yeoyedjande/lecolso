import { Copy, Eye, Lock, Pencil, Plus, ShieldCheck, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ScreenHeader } from '@/components/ScreenHeader'
import { QueryState } from '@/components/states/QueryState'
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
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { isSystemRole } from '@/features/auth/roles'
import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { ConflictError } from '@/lib/api/errors'
import { toast } from '@/lib/toast'

import { useDeleteRole, usePermissionCatalog, useSchoolRoles, type SchoolRole } from '../api'

import { RoleEditor, type EditorMode } from './RoleEditor'

function RolesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-44" />
      ))}
    </div>
  )
}

/** Rôles et permissions de l'établissement : rôles système puis rôles personnalisés (vraie API). */
export function RolesPage() {
  const { t } = useTranslation()
  const school = useCurrentSchool()
  const roles = useSchoolRoles()
  const catalog = usePermissionCatalog()
  const remove = useDeleteRole()
  const [editor, setEditor] = useState<EditorMode | null>(null)
  const [toDelete, setToDelete] = useState<SchoolRole | null>(null)
  // Un rôle vaut pour toute l'école : sa gestion exige roles.manage sur toute l'école
  const manage = school?.permissions['roles.manage'] === null

  const label = (role: SchoolRole): string =>
    isSystemRole(role.key) ? t(`roles.${role.key}`) : (role.name ?? t('roles.custom'))
  const description = (role: SchoolRole): string | null =>
    isSystemRole(role.key) ? t(`rolesAdmin.systemDescriptions.${role.key}`) : role.description

  const confirmDelete = async () => {
    if (toDelete === null) return
    try {
      await remove.mutateAsync(toDelete.key)
      toast(t('rolesAdmin.deleteDialog.done', { name: label(toDelete) }), { tone: 'success' })
    } catch (error) {
      toast(
        error instanceof ConflictError && error.code === 'role_in_use'
          ? t('rolesAdmin.deleteDialog.inUse')
          : t('common.error'),
        { tone: 'error' },
      )
    } finally {
      setToDelete(null)
    }
  }

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('rolesAdmin.title')}
        description={t('rolesAdmin.description')}
        actions={
          manage && (
            <Button
              variant="accent"
              onClick={() => {
                setEditor({ kind: 'create', template: null })
              }}
            >
              <Plus aria-hidden />
              {t('rolesAdmin.create')}
            </Button>
          )
        }
      />

      <QueryState query={roles} skeleton={<RolesSkeleton />}>
        {(list) => (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((role) => {
              const editable = manage && role.is_editable
              return (
                <li key={role.key}>
                  <Card className="h-full">
                    <CardContent className="flex h-full flex-col gap-4 pt-6">
                      <div className="flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary">
                          <ShieldCheck aria-hidden className="size-5" />
                        </span>
                        <div className="grid min-w-0 justify-items-start gap-1">
                          <h2 className="font-display text-lg leading-tight font-semibold break-words">
                            {label(role)}
                          </h2>
                          <Badge variant={role.is_system ? 'secondary' : 'default'}>
                            {role.is_system ? t('rolesAdmin.system') : t('rolesAdmin.custom')}
                          </Badge>
                        </div>
                      </div>
                      {description(role) !== null && (
                        <p className="text-sm text-muted-foreground">{description(role)}</p>
                      )}
                      <dl className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <dt className="sr-only">{t('rolesAdmin.usersLabel')}</dt>
                          <Users aria-hidden className="size-4" />
                          <dd>
                            {role.assignments_count === 0
                              ? t('rolesAdmin.usersNone')
                              : t('rolesAdmin.users', { count: role.assignments_count })}
                          </dd>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <dt className="sr-only">{t('rolesAdmin.editor.permissions')}</dt>
                          <dd>
                            {t('rolesAdmin.permissionsCount', { count: role.permissions.length })}
                          </dd>
                        </div>
                        {!role.is_editable && (
                          <div className="flex items-center gap-1.5">
                            <dt className="sr-only">{t('rolesAdmin.locked')}</dt>
                            <Lock aria-hidden className="size-4" />
                            <dd>{t('rolesAdmin.locked')}</dd>
                          </div>
                        )}
                      </dl>
                      <div className="flex flex-wrap gap-2 border-t pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`${editable ? t('rolesAdmin.edit') : t('rolesAdmin.view')} : ${label(role)}`}
                          onClick={() => {
                            setEditor(editable ? { kind: 'edit', role } : { kind: 'view', role })
                          }}
                        >
                          {editable ? <Pencil aria-hidden /> : <Eye aria-hidden />}
                          {editable ? t('rolesAdmin.edit') : t('rolesAdmin.view')}
                        </Button>
                        {manage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`${t('rolesAdmin.duplicate')} : ${label(role)}`}
                            onClick={() => {
                              setEditor({ kind: 'create', template: role })
                            }}
                          >
                            <Copy aria-hidden />
                            {t('rolesAdmin.duplicate')}
                          </Button>
                        )}
                        {manage && !role.is_system && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive-ink"
                            aria-label={`${t('rolesAdmin.delete')} : ${label(role)}`}
                            onClick={() => {
                              setToDelete(role)
                            }}
                          >
                            <Trash2 aria-hidden />
                            {t('rolesAdmin.delete')}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </QueryState>

      <Sheet
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) setEditor(null)
        }}
      >
        <SheetContent
          side="right"
          closeLabel={t('common.close')}
          className="w-full max-w-xl gap-0 sm:w-[36rem]"
        >
          {editor !== null && (
            <QueryState query={catalog}>
              {(permissions) => (
                <RoleEditor
                  mode={editor}
                  catalog={permissions}
                  label={label}
                  onDone={() => {
                    setEditor(null)
                  }}
                />
              )}
            </QueryState>
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
      >
        <DialogContent closeLabel={t('common.close')}>
          <DialogTitle>
            {toDelete !== null && t('rolesAdmin.deleteDialog.title', { name: label(toDelete) })}
          </DialogTitle>
          <DialogDescription>{t('rolesAdmin.deleteDialog.description')}</DialogDescription>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => void confirmDelete()}
            >
              <Trash2 aria-hidden />
              {t('rolesAdmin.deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
