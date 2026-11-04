/** Montant en toutes lettres pour les reçus : 150000 → « cent cinquante mille ». Entiers de 0 à 999 999 999. */
const UNITS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize',
  'quatorze', 'quinze', 'seize',
]
const TENS = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']

function belowHundred(n: number): string {
  if (n <= 16) return UNITS[n] ?? ''
  if (n < 20) return `dix-${UNITS[n - 10] ?? ''}`
  const ten = Math.floor(n / 10)
  const unit = n % 10
  if (ten === 7 || ten === 9) {
    const base = ten === 7 ? 'soixante' : 'quatre-vingt'
    const rest = 10 + unit
    return `${base}${ten === 7 && unit === 1 ? '-et-' : '-'}${belowHundred(rest)}`
  }
  if (ten === 8) return unit === 0 ? 'quatre-vingts' : `quatre-vingt-${UNITS[unit] ?? ''}`
  const word = TENS[ten] ?? ''
  if (unit === 0) return word
  return unit === 1 ? `${word}-et-un` : `${word}-${UNITS[unit] ?? ''}`
}

function belowThousand(n: number, final: boolean): string {
  const hundred = Math.floor(n / 100)
  const rest = n % 100
  const parts: string[] = []
  if (hundred > 0) {
    // « cents » prend un s s'il termine le nombre (deux cents), pas devant mille (deux cent mille)
    parts.push(hundred === 1 ? 'cent' : `${UNITS[hundred] ?? ''} cent${rest === 0 && final ? 's' : ''}`)
  }
  if (rest > 0) parts.push(belowHundred(rest))
  return parts.join(' ')
}

export function amountInWords(amount: number): string {
  if (!Number.isInteger(amount) || amount < 0 || amount > 999_999_999) throw new Error('Montant hors limites')
  if (amount === 0) return 'zéro'
  const millions = Math.floor(amount / 1_000_000)
  const thousands = Math.floor((amount % 1_000_000) / 1000)
  const rest = amount % 1000
  const parts: string[] = []
  if (millions > 0) parts.push(`${belowThousand(millions, true)} million${millions > 1 ? 's' : ''}`)
  if (thousands > 0) parts.push(thousands === 1 ? 'mille' : `${belowThousand(thousands, false)} mille`)
  if (rest > 0) parts.push(belowThousand(rest, true))
  return parts.join(' ')
}
