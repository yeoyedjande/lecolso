import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Contrat avec le backend (ADR 0005) : chaque segment fixe de premier niveau du routeur (/connexion, /plateforme…)
 * doit être réservé dans backend/config/tenancy.php, sinon une école pourrait prendre ce slug et sa page
 * serait masquée par la route globale (ou l'inverse).
 */
const ROOT = resolve(import.meta.dirname, '../../..')

function reservedSlugs(): Set<string> {
  const php = readFileSync(resolve(ROOT, '../backend/config/tenancy.php'), 'utf8')
  const block = php.slice(php.indexOf("'reserved_slugs'"))
  return new Set([...block.matchAll(/'([a-z0-9-]+)'/g)].map((match) => match[1] ?? ''))
}

function topLevelStaticSegments(): Set<string> {
  const tree = readFileSync(resolve(ROOT, 'src/routeTree.gen.ts'), 'utf8')
  const paths = [...tree.matchAll(/fullPath: '([^']*)'/g)].map((match) => match[1] ?? '')
  return new Set(
    paths
      .map((path) => path.split('/')[1] ?? '')
      .filter((segment) => segment !== '' && !segment.startsWith('$')),
  )
}

describe('segments réservés', () => {
  it('le backend réserve chaque route globale du frontend', () => {
    const reserved = reservedSlugs()
    const segments = topLevelStaticSegments()

    expect(segments.size).toBeGreaterThan(5)
    expect([...segments].filter((segment) => !reserved.has(segment))).toEqual([])
  })

  it('réserve aussi les sous-espaces d’une école et leurs équivalents anglais', () => {
    const reserved = reservedSlugs()
    for (const segment of [
      'tableau-de-bord',
      'parent',
      'enseignant',
      'preinscription',
      'login',
      'admin',
      'account',
      'dashboard',
      'api',
      'sanctum',
      'assets',
    ])
      expect(reserved.has(segment), segment).toBe(true)
  })
})
