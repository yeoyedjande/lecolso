import type { ReactNode } from 'react'

import { PageHeader } from './PageHeader'

/** En-tête d'écran du back-office. */
export function ScreenHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="grid gap-3">
      <PageHeader title={title} description={description} actions={actions} />
    </div>
  )
}
