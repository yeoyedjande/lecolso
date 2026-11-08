import { Link } from '@tanstack/react-router'
import { CalendarPlus, PenLine, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import {
  useConversations,
  useStartConversation,
  type ConversationChannel,
} from '@/features/messaging/api'
import { MobileConversations } from '@/features/messaging/components/MobileConversations'
import { ConflictError } from '@/lib/api/errors'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

import { useMyChildren } from '../api'

/** Écrire à l'école à propos d'un enfant : à son enseignant(e) ou à l'administration. */
function NewMessage({ onSent }: { onSent: (conversationId: string) => void }) {
  const { t } = useTranslation()
  const children = useMyChildren()
  const send = useStartConversation()
  const [childId, setChildId] = useState('')
  const [channel, setChannel] = useState<ConversationChannel>('teacher')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const list = children.data ?? []
  const child = list.find((candidate) => candidate.student.id === childId) ?? list[0]
  const channels: ConversationChannel[] = ['teacher', 'office']

  if (child === undefined) return null

  return (
    <Card>
      <CardContent className="p-4">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            send
              .mutateAsync({
                studentId: child.student.id,
                channel,
                subject: subject.trim(),
                body: body.trim(),
              })
              .then((detail) => {
                toast(t('parent.messages.sent'), { tone: 'success' })
                onSent(detail.conversation.id)
              })
              .catch((caught: unknown) => {
                toast(caught instanceof ConflictError ? caught.message : t('common.error'), {
                  tone: 'error',
                })
              })
          }}
        >
          <h2 className="font-display text-lg font-semibold">{t('parent.messages.new')}</h2>
          {list.length > 1 && (
            <Field label={t('parent.justify.child')}>
              {(control) => (
                <NativeSelect
                  {...control}
                  value={child.student.id}
                  onChange={(event) => {
                    setChildId(event.target.value)
                  }}
                >
                  {list.map((candidate) => (
                    <option key={candidate.student.id} value={candidate.student.id}>
                      {candidate.student.full_name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
          )}
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">{t('parent.messages.to')}</legend>
            {channels.map((value) => (
              <label
                key={value}
                className={cn(
                  'flex min-h-12 items-center gap-3 rounded-xl border bg-card px-3 text-sm',
                  channel === value && 'border-accent ring-2 ring-accent/20',
                )}
              >
                <input
                  type="radio"
                  name="channel"
                  className="size-4 accent-[var(--color-accent)]"
                  checked={channel === value}
                  onChange={() => {
                    setChannel(value)
                  }}
                />
                {t(`parent.messages.channels.${value}`)}
              </label>
            ))}
          </fieldset>
          <Field label={t('teacher.messages.subject')}>
            {(control) => (
              <Input
                {...control}
                required
                maxLength={120}
                value={subject}
                onChange={(event) => {
                  setSubject(event.target.value)
                }}
              />
            )}
          </Field>
          <Field label={t('teacher.messages.body')}>
            {(control) => (
              <Textarea
                {...control}
                required
                rows={3}
                maxLength={2000}
                value={body}
                onChange={(event) => {
                  setBody(event.target.value)
                }}
              />
            )}
          </Field>
          <Button
            type="submit"
            variant="accent"
            size="lg"
            disabled={subject.trim().length < 2 || body.trim() === '' || send.isPending}
          >
            <Send aria-hidden />
            {t('messaging.send')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

/** Messages du parent avec l'école : fils par enfant (enseignant(e) ou administration), nouveau message. */
export function ParentMessages() {
  const { t } = useTranslation()
  const conversations = useConversations()
  const [writing, setWriting] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="font-display text-2xl font-bold">{t('parent.messages.title')}</h1>
        <p className="text-muted-foreground">{t('parent.messages.subtitle')}</p>
      </div>
      {selected === null && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={writing ? 'ghost' : 'accent'}
            onClick={() => {
              setWriting(!writing)
            }}
          >
            <PenLine aria-hidden />
            {writing ? t('common.cancel') : t('parent.messages.write')}
          </Button>
          <Button asChild variant="outline">
            <Link from="/$school" to="/$school/parent/prevenir">
              <CalendarPlus aria-hidden />
              {t('parent.plan.title')}
            </Link>
          </Button>
        </div>
      )}
      {writing && selected === null && (
        <NewMessage
          onSent={(id) => {
            setWriting(false)
            setSelected(id)
          }}
        />
      )}
      <QueryState query={conversations}>
        {(list) => (
          <MobileConversations
            conversations={list}
            emptyLabel={t('parent.messages.empty')}
            selected={selected}
            onSelect={setSelected}
            titleOf={(conversation) =>
              t('parent.messages.about', {
                child: conversation.student.first_name,
                to: t(`messaging.channel.${conversation.channel}`),
              })
            }
          />
        )}
      </QueryState>
    </div>
  )
}
