import { ImageUp, Trash2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ValidationError } from '@/lib/api/errors'
import { toast } from '@/lib/toast'

import { PHOTO_MAX_BYTES, PHOTO_TYPES, useStudentPhoto } from '../api'

/**
 * Photo facultative d'un élève (guardianId null) ou d'un parent : affichage et, pour qui gère le dossier, envoi,
 * remplacement et retrait. Format et poids vérifiés avant l'envoi ; l'API redresse, réduit et retire les métadonnées.
 */
export function PhotoControl({
  studentId,
  guardianId,
  name,
  photoUrl,
  editable,
  size = 'lg',
  showAvatar = true,
}: {
  studentId: string
  guardianId: string | null
  name: string
  photoUrl: string | null
  editable: boolean
  size?: 'md' | 'lg' | 'xl'
  /** false : boutons seuls (l'avatar est affiché ailleurs, ex. carte d'un parent sur mobile). */
  showAvatar?: boolean
}) {
  const { t } = useTranslation()
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const photo = useStudentPhoto(studentId)
  const [error, setError] = useState<string | null>(null)

  const send = async (file: File | null) => {
    setError(null)
    if (file !== null && !PHOTO_TYPES.some((type) => type === file.type)) {
      setError(t('students.photo.type'))
      return
    }
    if (file !== null && file.size > PHOTO_MAX_BYTES) {
      setError(t('students.photo.tooBig'))
      return
    }
    try {
      await photo.mutateAsync({ guardianId, file })
      toast(file === null ? t('students.photo.removed') : t('students.photo.saved'), {
        tone: 'success',
      })
    } catch (caught) {
      setError(
        caught instanceof ValidationError
          ? (caught.fields.photo?.[0] ?? t('students.photo.failed'))
          : t('students.photo.failed'),
      )
    }
  }

  return (
    <div className="grid justify-items-start gap-2">
      {showAvatar && <Avatar name={name} photoUrl={photoUrl} size={size} />}
      {editable && (
        <div className="flex flex-wrap gap-1">
          <input
            ref={input}
            id={id}
            type="file"
            accept={PHOTO_TYPES.join(',')}
            className="sr-only"
            aria-label={t('students.photo.choose', { name })}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file !== undefined) void send(file)
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={photo.isPending}
            aria-label={
              photoUrl === null
                ? t('students.photo.addOf', { name })
                : t('students.photo.replaceOf', { name })
            }
            onClick={() => input.current?.click()}
          >
            <ImageUp aria-hidden />
            {photoUrl === null ? t('students.photo.add') : t('students.photo.replace')}
          </Button>
          {photoUrl !== null && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive-ink"
              disabled={photo.isPending}
              aria-label={t('students.photo.removeOf', { name })}
              onClick={() => void send(null)}
            >
              <Trash2 aria-hidden />
              {t('students.photo.remove')}
            </Button>
          )}
        </div>
      )}
      {error !== null && (
        <p role="alert" className="text-[13px] font-medium text-destructive-ink">
          {error}
        </p>
      )}
    </div>
  )
}
