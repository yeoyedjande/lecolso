/**
 * UUID v7 (ordonné dans le temps), comme les clés primaires du backend (règle 6 de CLAUDE.md) :
 * permet de créer des enregistrements hors connexion avec leur identifiant définitif.
 */
export function uuidv7(now: number = Date.now()): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  // 48 bits de timestamp en millisecondes (big-endian)
  let timestamp = now
  for (let i = 5; i >= 0; i--) {
    bytes[i] = timestamp % 256
    timestamp = Math.floor(timestamp / 256)
  }

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70 // version 7
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80 // variante RFC 9562

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
