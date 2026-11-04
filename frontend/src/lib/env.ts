import { z } from 'zod/mini'

/**
 * Variables d'environnement du build, validées au démarrage (fixées au build sur Railway).
 * - VITE_API_URL : URL de l'API (préfixe /api/v1 compris) ;
 * - VITE_APP_ENV : local | staging | production (défaut production : rien de réservé au développement) ;
 * - VITE_DEMO_MODULES : true pour afficher les données de démonstration des modules sans backend ;
 * - VITE_TENANT_DOMAIN : domaine des sous-domaines d'école (`<slug>.<domaine>`), facultatif.
 */
const envSchema = z.object({
  VITE_API_URL: z.pipe(
    z.url({ protocol: /^https?$/ }),
    z.transform((url) => url.replace(/\/+$/, '')),
  ),
  VITE_APP_ENV: z._default(z.enum(['local', 'staging', 'production']), 'production'),
  VITE_DEMO_MODULES: z.pipe(
    z._default(z.enum(['true', 'false']), 'false'),
    z.transform((value) => value === 'true'),
  ),
  VITE_TENANT_DOMAIN: z.pipe(
    z._default(z.string().check(z.regex(/^[a-z0-9.-]*$/)), ''),
    z.transform((value) => (value === '' ? null : value)),
  ),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  throw new Error(
    `Configuration invalide (voir frontend/.env.example). ${z.prettifyError(parsed.error)}`,
  )
}

export const env = {
  apiUrl: parsed.data.VITE_API_URL,
  appEnv: parsed.data.VITE_APP_ENV,
  demoModules: parsed.data.VITE_DEMO_MODULES,
  tenantDomain: parsed.data.VITE_TENANT_DOMAIN,
} as const

/** Page /design et outils de recette : en local et en staging seulement. */
export const designToolsEnabled = env.appEnv === 'local' || env.appEnv === 'staging'
