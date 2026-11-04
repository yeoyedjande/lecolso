/**
 * Pré-inscriptions en ligne (démonstration, en mémoire). Le module réel enregistrera la demande côté serveur
 * et l'affichera au secrétariat de l'école.
 */
export interface PreRegistrationInput {
  childFirstName: string
  childLastName: string
  birthDate: string
  level: string
  guardianName: string
  guardianPhone: string
  guardianEmail: string | null
  message: string
}

export interface PreRegistration extends PreRegistrationInput {
  reference: string
  createdAt: string
}

const requests = new Map<string, PreRegistration[]>()

export function submitPreRegistration(
  slug: string,
  input: PreRegistrationInput,
  now: Date,
): PreRegistration {
  const list = requests.get(slug) ?? []
  const created: PreRegistration = {
    ...input,
    reference: `PRE-${String(now.getUTCFullYear())}-${String(list.length + 1).padStart(4, '0')}`,
    createdAt: now.toISOString(),
  }
  requests.set(slug, [...list, created])
  return created
}

export function preRegistrations(slug: string): PreRegistration[] {
  return [...(requests.get(slug) ?? [])]
}
