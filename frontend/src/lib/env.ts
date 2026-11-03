import { z } from 'zod'

/**
 * Variables d'environnement du build, validées au démarrage.
 * L'URL de l'API vient uniquement de VITE_API_URL (fixée au build sur Railway).
 */
const envSchema = z.object({
  VITE_API_URL: z.url({ protocol: /^https?$/ }).transform((url) => url.replace(/\/+$/, '')),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  throw new Error(
    `Configuration invalide : VITE_API_URL doit être une URL http(s) (voir frontend/.env.example). ${z.prettifyError(parsed.error)}`,
  )
}

export const env = {
  apiUrl: parsed.data.VITE_API_URL,
} as const
