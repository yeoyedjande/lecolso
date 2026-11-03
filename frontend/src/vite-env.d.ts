/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL de base de l'API, préfixe /api/v1 compris (ex. http://localhost:8080/api/v1). */
  readonly VITE_API_URL: string
  /** local | staging | production (défaut : production). */
  readonly VITE_APP_ENV?: string
  /** « true » : données de démonstration pour les modules dont le backend n'existe pas encore. */
  readonly VITE_DEMO_MODULES?: string
  /** Domaine des sous-domaines d'école (`<slug>.<domaine>`), ex. lecolso.ci. Facultatif. */
  readonly VITE_TENANT_DOMAIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
