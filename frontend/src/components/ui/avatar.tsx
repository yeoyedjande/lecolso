import { useState } from 'react'

import { initialsOf, tintOf } from '@/lib/initials'
import { cn } from '@/lib/utils'

/**
 * Avatar : photo (URL signée renvoyée par l'API) ou, à défaut, initiales colorées. Décoratif : le nom est toujours
 * écrit à côté. Une photo illisible (URL expirée, réseau) retombe sur les initiales.
 */
function Avatar({
  name,
  photoUrl,
  size = 'md',
  className,
}: {
  name: string
  photoUrl?: string | null | undefined
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const [failed, setFailed] = useState<string | null>(null)
  const showPhoto = photoUrl != null && photoUrl !== '' && failed !== photoUrl

  return (
    <span
      data-slot="avatar"
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-display font-semibold',
        size === 'sm' && 'size-8 text-xs',
        size === 'md' && 'size-10 text-sm',
        size === 'lg' && 'size-14 text-lg',
        size === 'xl' && 'size-20 text-2xl',
        !showPhoto && tintOf(name),
        className,
      )}
    >
      {showPhoto ? (
        <img
          src={photoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => {
            setFailed(photoUrl)
          }}
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  )
}

export { Avatar }
