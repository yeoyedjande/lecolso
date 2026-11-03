import { CircleCheck, CircleX, LoaderCircle, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { useHealth, type HealthReport } from '../api'

type ComponentStatus = HealthReport['database']

function StatusBadge({ status }: { status: ComponentStatus }) {
  const { t } = useTranslation()
  const ok = status === 'ok'

  return (
    <Badge variant={ok ? 'success' : 'destructive'}>
      {ok ? <CircleCheck aria-hidden /> : <CircleX aria-hidden />}
      {t(ok ? 'health.status.ok' : 'health.status.error')}
    </Badge>
  )
}

/** État de l'API, de la base et de Redis, d'après GET /api/v1/health. */
export function HealthStatus() {
  const { t } = useTranslation()
  const { data, isPending, isError, refetch, isFetching } = useHealth()

  if (isPending) {
    return (
      <p role="status" className="text-muted-foreground flex items-center gap-2">
        <LoaderCircle aria-hidden className="size-4 animate-spin" />
        {t('health.api', { status: t('health.status.checking') })}
      </p>
    )
  }

  if (isError) {
    return (
      <div role="alert" className="flex flex-col gap-3">
        <p className="text-destructive flex items-center gap-2 font-semibold">
          <WifiOff aria-hidden className="size-5" />
          {t('health.api', { status: t('health.status.unreachable') })}
        </p>
        <p className="text-muted-foreground text-sm">{t('health.unreachableHelp')}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="bg-primary text-primary-foreground min-h-11 w-fit rounded-md px-4 font-medium disabled:opacity-50"
        >
          {t('health.retry')}
        </button>
      </div>
    )
  }

  const ok = data.status === 'ok'

  return (
    <Card>
      <CardHeader>
        <CardTitle
          role="status"
          className={cn(
            'flex items-center gap-2 text-lg',
            ok ? 'text-success' : 'text-destructive',
          )}
        >
          {ok ? <CircleCheck aria-hidden /> : <CircleX aria-hidden />}
          {t('health.api', { status: t(ok ? 'health.status.ok' : 'health.status.unavailable') })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3">
          <dt>{t('health.database')}</dt>
          <dd>
            <StatusBadge status={data.database} />
          </dd>
          <dt>{t('health.redis')}</dt>
          <dd>
            <StatusBadge status={data.redis} />
          </dd>
        </dl>
      </CardContent>
    </Card>
  )
}
