import type { DemoSchool } from '@/lib/demo/types'

export interface SchoolIdentity {
  name: string
  address: string
  phone: string
  email: string
  motto: string
  year: string
}

export function identity(school: DemoSchool): SchoolIdentity {
  return {
    name: school.name,
    address: school.address,
    phone: school.phone,
    email: school.email,
    motto: school.motto,
    year: school.year,
  }
}

export function updateIdentity(school: DemoSchool, input: Omit<SchoolIdentity, 'year'>): void {
  Object.assign(school, input)
}
