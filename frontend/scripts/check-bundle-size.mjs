// Budget JS initial (frontend/CLAUDE.md) : scripts chargés au premier affichage < 300 Ko gzip.
// Lit dist/index.html (script d'entrée + modulepreload) après `npm run build`.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGET = 300 * 1024
const dist = new URL('../dist/', import.meta.url).pathname
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const files = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map((match) => match[1])

let total = 0
for (const file of new Set(files)) {
  const size = gzipSync(readFileSync(join(dist, file))).length
  total += size
  console.log(`${(size / 1024).toFixed(1).padStart(7)} Ko  ${file}`)
}
console.log(`${(total / 1024).toFixed(1).padStart(7)} Ko  total gzip (budget ${BUDGET / 1024} Ko)`)

if (files.length === 0 || total > BUDGET) {
  console.error(
    files.length === 0 ? 'Aucun script trouvé dans dist/index.html' : 'Budget JS initial dépassé',
  )
  process.exit(1)
}
