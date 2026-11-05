import { useTranslation } from 'react-i18next'

import { isErrorCode } from './enrollmentSchema'

/** Message d'un champ : code du schéma traduit, ou message du serveur (422) tel quel. */
export function useFieldMessage() {
  const { t } = useTranslation()
  return (message: string | undefined): string | undefined =>
    message === undefined
      ? undefined
      : isErrorCode(message)
        ? t(`enrollment.errors.${message}`)
        : message
}
