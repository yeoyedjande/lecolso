import 'i18next'

import type fr from './fr.json'

// Clés de traduction typées : t('health.titre') est une erreur de compilation
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: typeof fr
    }
  }
}
