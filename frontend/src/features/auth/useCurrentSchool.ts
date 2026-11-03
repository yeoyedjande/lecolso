import { useSyncExternalStore } from 'react'

import { session } from '@/lib/api/session'

import { findMembership, type Membership } from './access'
import { useMe } from './api'

/** Établissement sélectionné (et ses rôles, permissions) d'après le profil à jour. */
export function useCurrentSchool(): Membership | null {
  const { data: profile } = useMe()
  const schoolId = useSyncExternalStore(session.subscribeSchool, session.getSchoolId, () => null)
  return profile === undefined ? null : findMembership(profile, schoolId)
}
