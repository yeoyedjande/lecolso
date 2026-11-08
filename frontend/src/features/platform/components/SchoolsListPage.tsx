import { Link } from '@tanstack/react-router'
import { ExternalLink, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ScreenHeader } from '@/components/ScreenHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { QueryState } from '@/components/states/QueryState'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/format'

import { usePlatformSchools } from '../api'

/** Liste des écoles de la plateforme (vraie API, super-admin). */
export function SchoolsListPage() {
  const { t } = useTranslation()
  const query = usePlatformSchools()

  return (
    <div className="grid gap-6">
      <ScreenHeader
        title={t('platform.schools.title')}
        description={t('platform.schools.description')}
        actions={
          <Button asChild variant="accent">
            <Link to="/plateforme/nouvelle">
              <Plus aria-hidden />
              {t('platform.schools.create')}
            </Link>
          </Button>
        }
      />
      <QueryState query={query}>
        {({ schools, hasMore }) =>
          schools.length === 0 ? (
            <EmptyState title={t('platform.schools.empty')} />
          ) : (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">
                {t('platform.schools.count', { count: schools.length })}
              </p>
              <Card className="overflow-hidden p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('platform.schools.name')}</TableHead>
                      <TableHead>{t('platform.schools.city')}</TableHead>
                      <TableHead>{t('platform.schools.type')}</TableHead>
                      <TableHead>{t('platform.schools.createdAt')}</TableHead>
                      <TableHead className="text-right">
                        <span className="sr-only">{t('common.actions')}</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map((school) => (
                      <TableRow key={school.id}>
                        <TableCell>
                          <span className="flex items-center gap-3">
                            <Avatar name={school.name} size="sm" />
                            <span className="grid">
                              <span className="font-semibold">{school.name}</span>
                              <span className="text-xs text-muted-foreground">{school.slug}</span>
                            </span>
                          </span>
                        </TableCell>
                        <TableCell>{school.city ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {t(`platform.schools.types.${school.type}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {school.created_at === null ? '—' : formatDate(school.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            asChild
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t('platform.schools.visit', { name: school.name })}
                          >
                            <Link to="/$school" params={{ school: school.slug }}>
                              <ExternalLink aria-hidden />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              {hasMore && (
                <p className="text-sm text-muted-foreground">{t('platform.schools.more')}</p>
              )}
            </div>
          )
        }
      </QueryState>
    </div>
  )
}
