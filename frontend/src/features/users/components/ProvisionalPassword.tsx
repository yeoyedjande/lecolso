import { Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'

/** Mot de passe provisoire affiché une seule fois, à recopier ou à copier. */
export function ProvisionalPassword({ password, intro }: { password: string; intro: string }) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-2 rounded-2xl bg-muted p-4" role="status">
      <p className="text-sm">{intro}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <code className="font-display text-2xl font-bold tracking-wide">{password}</code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void navigator.clipboard.writeText(password).then(() => {
              toast(t('usersAdmin.sheet.copied'), { tone: 'success' })
            })
          }}
        >
          <Copy aria-hidden />
          {t('usersAdmin.sheet.copy')}
        </Button>
      </div>
    </div>
  )
}
