/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL de base de l'API, préfixe /api/v1 compris (ex. http://localhost:8080/api/v1). */
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
