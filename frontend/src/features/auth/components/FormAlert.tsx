import { CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

/** Erreur générale d'un formulaire (hors erreurs de champ). */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive-soft px-4 py-3 text-sm text-destructive-ink"
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  )
}
