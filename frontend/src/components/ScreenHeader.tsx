import type { ReactNode } from 'react'

import { PageHeader } from './PageHeader'
import { DemoBanner } from './states/DemoBanner'

/** En-tête d'écran du back-office ; `demo` : bandeau « Données de démonstration ». */
export function ScreenHeader({
  title,
  description,
  actions,
  demo = true,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  demo?: boolean
}) {
  return (
    <div className="grid gap-3">
      {demo && <DemoBanner />}
      <PageHeader title={title} description={description} actions={actions} />
    </div>
  )
}
