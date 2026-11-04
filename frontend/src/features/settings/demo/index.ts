import type { DemoSchool, DemoStaff } from '@/lib/demo/types'

export interface SchoolIdentity {
  name: string
  address: string
  phone: string
  email: string
  motto: string
  year: string
}

export function identity(school: DemoSchool): SchoolIdentity {
  return { name: school.name, address: school.address, phone: school.phone, email: school.email, motto: school.motto, year: school.year }
}

export function updateIdentity(school: DemoSchool, input: Omit<SchoolIdentity, 'year'>): void {
  Object.assign(school, input)
}

export function staff(school: DemoSchool): DemoStaff[] {
  return [...school.staff].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

/** Mot de passe provisoire lisible (démonstration : l'API réelle le génère côté serveur). */
export function provisionalPassword(random: () => number = Math.random): string {
  const words = ['Baobab', 'Lagune', 'Akwaba', 'Soleil', 'Savane', 'Cacao', 'Manguier', 'Ebene']
  const word = words[Math.floor(random() * words.length)] ?? 'Akwaba'
  return `${word}-${String(Math.floor(1000 + random() * 9000))}`
}
