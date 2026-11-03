/** Teintes des avatars (fond doux + texte foncé AA), choisies de façon stable à partir du nom. */
const TINTS = [
  'bg-cycle-daycare-soft text-cycle-daycare-ink',
  'bg-cycle-kindergarten-soft text-cycle-kindergarten-ink',
  'bg-cycle-primary-soft text-cycle-primary-ink',
  'bg-success-soft text-success-ink',
  'bg-orange-100 text-accent-ink dark:bg-orange/20',
  'bg-navy-100 text-navy dark:bg-white/10 dark:text-foreground',
] as const

/** « Awa Koné » → « AK » ; « Awa » → « AW ». */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? ''
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : (words[0]?.[1] ?? '')
  return (first + last).toUpperCase()
}

export function tintOf(name: string): string {
  let hash = 0
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return TINTS[hash % TINTS.length] ?? TINTS[0]
}
