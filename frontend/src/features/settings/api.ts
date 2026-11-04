import { useDemoMutation, useDemoQuery } from '@/lib/demo/hooks'

import { identity, updateIdentity, type SchoolIdentity } from './demo'

export function useSchoolIdentity() {
  return useDemoQuery(['settings', 'identity'], (school) => identity(school))
}

export function useUpdateIdentity() {
  return useDemoMutation((school, input: Omit<SchoolIdentity, 'year'>) => {
    updateIdentity(school, input)
  })
}
