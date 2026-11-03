/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/*
 * Contrastes AA (≥ 4,5:1 pour le texte) des paires texte/fond du design system, lus dans index.css :
 * une couleur modifiée qui passerait sous le seuil fait échouer ce test.
 */

// Vitest est lancé depuis frontend/ : le CSS est lu tel quel (l'import ?raw de Vite le traite et le vide)
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`)
  const end = css.indexOf('}', start)
  return css.slice(start, end)
}

function tokens(selector: string): Record<string, string> {
  const found: Record<string, string> = {}
  for (const match of block(selector).matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/g)) {
    const [, name, value] = match
    if (name !== undefined && value !== undefined) {
      found[name] = value
    }
  }
  return found
}

/** Propriétés déclarées et références var(--…) de tout le fichier (tokens, @theme). */
const declared = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((match) => match[1]))
const declarations = [...css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)]

describe('références entre tokens', () => {
  it('aucun token ne se référence lui-même (valeur invalide, couleur perdue)', () => {
    const cyclic = declarations
      .filter(([, name, value]) => value?.includes(`var(${name ?? ''})`))
      .map(([, name]) => name)
    expect(cyclic).toEqual([])
  })

  it('toute référence var(--…) vise un token déclaré', () => {
    const missing = declarations
      .flatMap(([, , value]) =>
        [...(value ?? '').matchAll(/var\((--[a-z0-9-]+)/g)].map((match) => match[1]),
      )
      .filter((name) => name !== undefined && !declared.has(name))
    expect(missing).toEqual([])
  })
})

const light = tokens(':root')
const dark = { ...light, ...tokens('.dark') }

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05)
}

function pick(palette: Record<string, string>, name: string): string {
  const value = palette[name]
  if (value === undefined) {
    throw new Error(`Token --${name} introuvable dans index.css`)
  }
  return value
}

const textPairs: [string, string][] = [
  ['navy', 'cream'],
  ['navy', 'white'],
  ['warm-600', 'cream'],
  ['warm-600', 'white'],
  ['orange-ink', 'cream'],
  ['orange-ink', 'white'],
  ['success-ink', 'cream'],
  ['danger-ink', 'cream'],
  ['cycle-daycare-ink', 'cream'],
  ['cycle-kindergarten-ink', 'cream'],
  ['cycle-primary-ink', 'cream'],
  ['cycle-other-ink', 'cream'],
  // Texte bleu nuit posé sur les couleurs vives (boutons d'accent, pastilles)
  // Encres sur fonds doux (pastilles, avatars, alertes)
  ['orange-ink', 'orange-100'],
  ['success-ink', 'success-100'],
  ['danger-ink', 'danger-100'],
  ['cycle-daycare-ink', 'cycle-daycare-soft'],
  ['cycle-kindergarten-ink', 'cycle-kindergarten-soft'],
  ['cycle-primary-ink', 'cycle-primary-soft'],
  ['cycle-other-ink', 'cycle-other-soft'],
  ['navy', 'navy-100'],
  ['navy', 'orange'],
  ['navy', 'cycle-daycare'],
  ['navy', 'cycle-kindergarten'],
  // Texte clair sur les surfaces bleu nuit (barre latérale, bouton primaire)
  ['white', 'navy'],
]

describe('contrastes du design system (AA)', () => {
  it.each(textPairs)('%s sur %s ≥ 4,5:1 (clair)', (text, background) => {
    expect(contrast(pick(light, text), pick(light, background))).toBeGreaterThanOrEqual(4.5)
  })

  it.each([
    ['foreground', 'background'],
    ['foreground', 'surface'],
    ['muted-foreground', 'background'],
    ['muted-foreground', 'surface'],
    ['primary-foreground', 'primary'],
    ['accent-ink', 'surface'],
    ['success-ink', 'surface'],
    ['destructive-ink', 'surface'],
    ['cycle-daycare-ink', 'surface'],
    ['cycle-kindergarten-ink', 'surface'],
    ['cycle-primary-ink', 'surface'],
  ])('%s sur %s ≥ 4,5:1 (sombre, back-office)', (text, background) => {
    expect(contrast(pick(dark, text), pick(dark, background))).toBeGreaterThanOrEqual(4.5)
  })
})
