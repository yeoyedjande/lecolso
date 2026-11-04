/** « École Les Flamboyants » → « ecole-les-flamboyants » (sous-domaine de la page de l'école). */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '')
}

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/
