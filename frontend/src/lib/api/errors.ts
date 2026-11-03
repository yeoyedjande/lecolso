import { z } from 'zod'

/** 401 : token absent, expiré ou révoqué. La session locale est effacée par le middleware. */
export class UnauthorizedError extends Error {
  override readonly name = 'UnauthorizedError'

  constructor() {
    super('Session expirée ou invalide')
  }
}

/** 422 : erreurs de validation Laravel, à afficher sur les champs du formulaire. */
export class ValidationError extends Error {
  override readonly name = 'ValidationError'

  /** Messages par champ, clés au format Laravel (`guardian.phone`, `items.0.amount`). */
  readonly fields: Readonly<Record<string, readonly string[]>>

  constructor(message: string, fields: Readonly<Record<string, readonly string[]>>) {
    super(message)
    this.fields = fields
  }
}

export const validationErrorBodySchema = z.object({
  message: z.string(),
  errors: z.record(z.string(), z.array(z.string())),
})
