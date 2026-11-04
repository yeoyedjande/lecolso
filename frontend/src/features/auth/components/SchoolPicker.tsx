import { Check, ChevronRight } from 'lucide-react'

import { Reveal } from '@/components/motion/Reveal'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { Membership } from '../access'
import { distinctRoles, useRoleLabel } from '../roles'

/** Cartes des établissements de l'utilisateur ; l'établissement courant est signalé. */
export function SchoolPicker({
  schools,
  currentId,
  onPick,
}: {
  schools: Membership[]
  currentId: string | null
  onPick: (school: Membership) => void
}) {
  const roleLabel = useRoleLabel()

  return (
    <ul className="grid gap-3">
      {schools.map((school, index) => {
        const current = school.id === currentId
        return (
          <li key={school.id}>
            <Reveal index={index}>
              <button
                type="button"
                onClick={() => {
                  onPick(school)
                }}
                aria-current={current ? 'true' : undefined}
                className={cn(
                  'group flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-soft transition',
                  'hover:-translate-y-0.5 hover:border-accent hover:shadow-lift focus-visible:border-accent',
                  current && 'border-accent ring-2 ring-accent/30',
                )}
              >
                <Avatar name={school.name} size="lg" className="rounded-2xl" />
                <span className="grid min-w-0 flex-1 gap-2">
                  <span className="truncate font-display text-lg font-semibold">{school.name}</span>
                  <span className="flex flex-wrap gap-1.5">
                    {distinctRoles(school).map((role) => (
                      <Badge key={role.role} variant="secondary">
                        {roleLabel(role)}
                      </Badge>
                    ))}
                  </span>
                </span>
                {current ? (
                  <Check aria-hidden className="size-5 text-accent-ink" />
                ) : (
                  <ChevronRight
                    aria-hidden
                    className="size-5 text-muted-foreground transition group-hover:translate-x-0.5"
                  />
                )}
              </button>
            </Reveal>
          </li>
        )
      })}
    </ul>
  )
}
