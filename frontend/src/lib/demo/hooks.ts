import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'

import { useCurrentSchool } from '@/features/auth/useCurrentSchool'

import { demo, demoSchool, today, type DemoKey } from './store'
import type { DemoSchool } from './types'

function useDemoKey(): DemoKey | null {
  const school = useCurrentSchool()
  return school === null ? null : { id: school.id, slug: school.slug }
}

/**
 * Lecture d'un module en démonstration. Clé : ['school', <id>, ...parts] (retirée du cache au changement
 * d'établissement). Quand l'API du module existera, seul le queryFn du hook appelant changera.
 */
export function useDemoQuery<T>(parts: QueryKey, select: (school: DemoSchool, today: string) => T) {
  const key = useDemoKey()
  return useQuery({
    queryKey: ['school', key?.id ?? null, ...parts],
    enabled: key !== null,
    queryFn: () =>
      demo(() => {
        if (key === null) throw new Error('Aucun établissement sélectionné')
        return select(demoSchool(key), today())
      }),
  })
}

/** Écriture en démonstration ; toutes les données de l'établissement sont ensuite relues (écrans liés). */
export function useDemoMutation<Input, Result>(
  run: (school: DemoSchool, input: Input, today: string) => Result,
) {
  const key = useDemoKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Input) =>
      demo(() => {
        if (key === null) throw new Error('Aucun établissement sélectionné')
        return run(demoSchool(key), input, today())
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['school', key?.id ?? null] }),
  })
}
