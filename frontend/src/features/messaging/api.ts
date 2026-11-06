import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCurrentSchool } from '@/features/auth/useCurrentSchool'
import { api } from '@/lib/api/client'
import type { components } from '@/lib/api/schema'

export type Conversation = components['schemas']['ConversationResource']
export type ConversationDetail = components['schemas']['ConversationDetailResource']
export type Message = components['schemas']['MessageResource']
export type ConversationChannel = Conversation['channel']

function useMessagingKey() {
  const school = useCurrentSchool()
  return { school, key: ['school', school?.id ?? null, 'messaging'] as const }
}

/** Relecture : les messages de l'autre côté arrivent sans notification (pas de push en V1). */
const REFRESH_MS = 90_000

/** Fils visibles par l'utilisateur (parent, titulaire, administration du cycle), le plus récent d'abord. */
export function useConversations() {
  const { school, key } = useMessagingKey()
  return useQuery({
    queryKey: [...key, 'list'],
    enabled: school !== null,
    refetchInterval: REFRESH_MS,
    queryFn: async ({ signal }): Promise<Conversation[]> => {
      const { data, error } = await api.GET('/conversations', { signal })
      if (data === undefined) throw new Error('Messages indisponibles', { cause: error })
      return data.data
    },
  })
}

/** Nombre de fils non lus (pastille de la navigation). */
export function useUnreadCount(enabled = true) {
  const { school, key } = useMessagingKey()
  return useQuery({
    queryKey: [...key, 'unread'],
    enabled: enabled && school !== null,
    refetchInterval: REFRESH_MS,
    queryFn: async ({ signal }): Promise<number> => {
      const { data, error } = await api.GET('/conversations/unread-count', { signal })
      if (data === undefined) throw new Error('Non-lus indisponibles', { cause: error })
      return data.data.count
    },
  })
}

/** Un fil et ses messages ; `null` s'il n'est pas (ou plus) visible. */
export function useConversation(id: string | null) {
  const { school, key } = useMessagingKey()
  return useQuery({
    queryKey: [...key, 'conversation', id],
    enabled: school !== null && id !== null,
    refetchInterval: REFRESH_MS,
    queryFn: async ({ signal }): Promise<ConversationDetail | null> => {
      const { data, error, response } = await api.GET('/conversations/{conversation}', {
        params: { path: { conversation: id ?? '' } },
        signal,
      })
      if (response.status === 404) return null
      if (data === undefined) throw new Error('Fil indisponible', { cause: error })
      return data.data
    },
  })
}

function useRefresh() {
  const { key } = useMessagingKey()
  const queryClient = useQueryClient()
  return async (detail: ConversationDetail) => {
    queryClient.setQueryData([...key, 'conversation', detail.conversation.id], detail)
    await queryClient.invalidateQueries({ queryKey: [...key, 'list'] })
    await queryClient.invalidateQueries({ queryKey: [...key, 'unread'] })
  }
}

/** Écrire à propos d'un enfant : au titulaire ou à l'administration (parent), ou à un tuteur (école). */
export function useStartConversation() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (input: {
      studentId: string
      channel: ConversationChannel
      subject: string
      body: string
      guardianId?: string | null
    }): Promise<ConversationDetail> => {
      const { data, response } = await api.POST('/conversations', {
        body: {
          student_id: input.studentId,
          channel: input.channel,
          subject: input.subject,
          body: input.body,
          guardian_id: input.guardianId ?? null,
        },
      })
      if (data === undefined) throw new Error(`Envoi impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: refresh,
  })
}

/** Répondre dans un fil. */
export function useReply() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (input: {
      conversationId: string
      body: string
    }): Promise<ConversationDetail> => {
      const { data, response } = await api.POST('/conversations/{conversation}/messages', {
        params: { path: { conversation: input.conversationId } },
        body: { body: input.body },
      })
      if (data === undefined) throw new Error(`Envoi impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: refresh,
  })
}

/** Marquer un fil comme lu (à son ouverture). */
export function useMarkRead() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (conversationId: string): Promise<ConversationDetail> => {
      const { data, response } = await api.POST('/conversations/{conversation}/read', {
        params: { path: { conversation: conversationId } },
      })
      if (data === undefined) throw new Error(`Lecture impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: refresh,
  })
}

export type Announcement = components['schemas']['AnnouncementResource']
export type AnnouncementTargets = components['schemas']['AnnouncementTargetsResource']
export type AnnouncementAudience = Announcement['audience']

/** Annonces que l'utilisateur lit (toute l'école, ses cycles, ses classes ; parent : celles de ses enfants). */
export function useAnnouncements() {
  const { school, key } = useMessagingKey()
  return useQuery({
    queryKey: [...key, 'announcements'],
    enabled: school !== null,
    refetchInterval: REFRESH_MS,
    queryFn: async ({ signal }): Promise<Announcement[]> => {
      const { data, error } = await api.GET('/announcements', { signal })
      if (data === undefined) throw new Error('Annonces indisponibles', { cause: error })
      return data.data
    },
  })
}

/** Publics que l'utilisateur peut viser (toute l'école, ses cycles, ses classes). */
export function useAnnouncementTargets(enabled = true) {
  const { school, key } = useMessagingKey()
  return useQuery({
    queryKey: [...key, 'announcement-targets'],
    enabled: enabled && school !== null,
    queryFn: async ({ signal }): Promise<AnnouncementTargets> => {
      const { data, error } = await api.GET('/announcements/targets', { signal })
      if (data === undefined) throw new Error('Publics indisponibles', { cause: error })
      return data.data
    },
  })
}

/** Publier une annonce (dans l'appli ; le SMS viendra avec le fournisseur). */
export function usePublishAnnouncement() {
  const { key } = useMessagingKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      title: string
      body: string
      audience: AnnouncementAudience
      cycleId: string | null
      classroomId: string | null
    }): Promise<Announcement> => {
      const { data, response } = await api.POST('/announcements', {
        body: {
          title: input.title,
          body: input.body,
          audience: input.audience,
          cycle_id: input.audience === 'cycle' ? input.cycleId : null,
          classroom_id: input.audience === 'classroom' ? input.classroomId : null,
        },
      })
      if (data === undefined) throw new Error(`Publication impossible (${String(response.status)})`)
      return data.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...key, 'announcements'] })
    },
  })
}

/** Retirer une annonce. */
export function useDeleteAnnouncement() {
  const { key } = useMessagingKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { response } = await api.DELETE('/announcements/{announcement}', {
        params: { path: { announcement: id } },
      })
      if (!response.ok) throw new Error(`Retrait impossible (${String(response.status)})`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...key, 'announcements'] })
    },
  })
}
