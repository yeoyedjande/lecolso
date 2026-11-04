/** Générateur pseudo-aléatoire déterministe (mulberry32) : mêmes données à chaque chargement. */
export interface Random {
  next: () => number
  int: (min: number, max: number) => number
  pick: <T>(items: readonly T[]) => T
  chance: (probability: number) => boolean
}

export function seedFrom(text: string): number {
  let hash = 2166136261
  for (const char of text) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  }
  return hash >>> 0
}

export function createRandom(seed: number): Random {
  let state = seed
  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1))
  const pick = <T>(items: readonly T[]): T => {
    const item = items[Math.floor(next() * items.length)]
    if (item === undefined) throw new Error('Liste vide')
    return item
  }
  return { next, int, pick, chance: (probability) => next() < probability }
}
