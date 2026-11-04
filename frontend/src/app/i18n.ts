import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import fr from '@/i18n/fr.json'

void i18n.use(initReactI18next).init({
  lng: 'fr',
  fallbackLng: 'fr',
  resources: {
    fr: { translation: fr },
  },
  interpolation: {
    // React échappe déjà les valeurs
    escapeValue: false,
  },
  returnNull: false,
})

export default i18n
