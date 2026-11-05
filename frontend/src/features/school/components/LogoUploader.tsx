import { ImageUp, Trash2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'

import {
  LOGO_MAX_BYTES,
  LOGO_TYPES,
  useRemoveLogo,
  useUploadLogo,
  type SchoolProfile,
} from '../api'

import { SchoolLogo } from './SchoolLogo'

/** Envoi, remplacement et retrait du logo ; format et poids vérifiés avant l'envoi (l'API revérifie tout). */
export function LogoUploader({ profile, editable }: { profile: SchoolProfile; editable: boolean }) {
  const { t } = useTranslation()
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const upload = useUploadLogo()
  const remove = useRemoveLogo()
  const [error, setError] = useState<string | null>(null)
  const busy = upload.isPending || remove.isPending

  const send = async (file: File) => {
    setError(null)
    if (!LOGO_TYPES.some((type) => type === file.type)) {
      setError(t('settings.identity.logoType'))
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError(t('settings.identity.logoTooBig'))
      return
    }
    try {
      await upload.mutateAsync(file)
      toast(t('settings.identity.logoUploaded'), { tone: 'success' })
    } catch {
      setError(t('settings.identity.logoFailed'))
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid size-24 shrink-0 place-items-center rounded-2xl border border-dashed bg-muted">
          {profile.logo_url === null ? (
            <span className="px-2 text-center text-xs text-muted-foreground">
              {t('settings.identity.noLogo')}
            </span>
          ) : (
            <SchoolLogo url={profile.logo_url} name={profile.name} className="size-22" />
          )}
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <input
              ref={input}
              id={id}
              type="file"
              accept={LOGO_TYPES.join(',')}
              className="sr-only"
              aria-label={t('settings.identity.chooseLogo')}
              aria-describedby={`${id}-hint${error === null ? '' : ` ${id}-error`}`}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file !== undefined) void send(file)
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              <ImageUp aria-hidden />
              {profile.logo_url === null
                ? t('settings.identity.chooseLogo')
                : t('settings.identity.replaceLogo')}
            </Button>
            {profile.logo_url !== null && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive-ink"
                disabled={busy}
                onClick={() => {
                  setError(null)
                  remove
                    .mutateAsync()
                    .then(() => {
                      toast(t('settings.identity.logoRemoved'), { tone: 'success' })
                    })
                    .catch(() => {
                      setError(t('settings.identity.logoFailed'))
                    })
                }}
              >
                <Trash2 aria-hidden />
                {t('settings.identity.removeLogo')}
              </Button>
            )}
          </div>
        )}
      </div>
      <p id={`${id}-hint`} className="text-[13px] text-muted-foreground">
        {t('settings.identity.logoHint')}
      </p>
      {error !== null && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive-ink">
          {error}
        </p>
      )}
    </div>
  )
}
