import { z } from 'zod/mini'

/**
 * Variables d'environnement du build, validées au démarrage (fixées au build sur Railway).
 * - VITE_API_URL : URL de l'API (préfixe /api/v1 compris) : chemin « /api/v1 » en staging et en production
 *   (même origine, proxy Caddy, ADR 0005), URL absolue en développement local ;
 * - VITE_APP_ENV : local | staging | production (défaut production : rien de réservé au développement).
 * Aucune variable de domaine : les écoles sont servies par chemin (`/{slug}`, ADR 0005), jamais par sous-domaine.
 */
const envSchema = z.object({
  VITE_API_URL: z.pipe(
    z.union([z.url({ protocol: /^https?$/ }), z.string().check(z.regex(/^\/[a-z0-9/_-]+$/i))]),
    z.transform((url) => url.replace(/\/+$/, '')),
  ),
  VITE_APP_ENV: z._default(z.enum(['local', 'staging', 'production']), 'production'),
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
} as const

/** Page /design et outils de recette : en local et en staging seulement. */
export const designToolsEnabled = env.appEnv === 'local' || env.appEnv === 'staging'
