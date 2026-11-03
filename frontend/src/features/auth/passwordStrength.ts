/** Robustesse indicative d'un mot de passe (0 à 4), pour l'indicateur ; la règle imposée reste 8 caractères minimum. */
export type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong'

export function passwordScore(password: string): number {
  if (password.length < 8) return password.length === 0 ? 0 : 1
  let score = 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1
  return Math.min(score, 4)
}

export function strengthLevel(score: number): StrengthLevel {
  if (score <= 1) return 'weak'
  if (score === 2) return 'fair'
  if (score === 3) return 'good'
  return 'strong'
}
