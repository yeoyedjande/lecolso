import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/lib/toast'

import { useUpdateSchoolProfile, type SchoolProfile } from '../api'

/** Réglage de la page publique : publier ou non les tarifs de l'année en cours (désactivé par défaut). */
export function PublicPageSettings({
  profile,
  editable,
}: {
  profile: SchoolProfile
  editable: boolean
}) {
  const { t } = useTranslation()
  const update = useUpdateSchoolProfile()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.publicPage.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-start gap-3">
        <Switch
          id="public-fees"
          checked={profile.public_fees}
          disabled={!editable || update.isPending}
          onCheckedChange={(checked) => {
            update.mutate(
              { public_fees: checked },
              {
                onSuccess: () => {
                  toast(
                    checked ? t('settings.publicPage.feesOn') : t('settings.publicPage.feesOff'),
                    { tone: 'success' },
                  )
                },
                onError: () => {
                  toast(t('settings.identity.failed'), { tone: 'error' })
                },
              },
            )
          }}
        />
        <div className="grid gap-1">
          <Label htmlFor="public-fees">{t('settings.publicPage.fees')}</Label>
          <p className="text-sm text-muted-foreground">{t('settings.publicPage.feesHint')}</p>
        </div>
      </CardContent>
    </Card>
  )
}
