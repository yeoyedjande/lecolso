import { initialsOf, tintOf } from '@/lib/initials'
import { cn } from '@/lib/utils'

/** Avatar par initiales colorées (aucune photo de personne). */
function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <span
      data-slot="avatar"
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full font-display font-semibold',
        size === 'sm' && 'size-8 text-xs',
        size === 'md' && 'size-10 text-sm',
        size === 'lg' && 'size-14 text-lg',
        tintOf(name),
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  )
}

export { Avatar }
