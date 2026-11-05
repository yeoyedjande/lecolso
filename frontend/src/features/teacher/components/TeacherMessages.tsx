import { Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DemoBanner } from '@/components/states/DemoBanner'
import { QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useMe } from '@/features/auth/api'
import { useReply } from '@/features/messaging/api'
import { MobileConversations } from '@/features/messaging/components/MobileConversations'
import { useDemoStudents } from '@/features/students/api'
import { toast } from '@/lib/toast'

import { useMessageParent, useMyClasses, useTeacherConversations } from '../api'

/** Messages aux parents des élèves de ses classes : nouveaux messages et suite des échanges. */
export function TeacherMessages() {
  const { t } = useTranslation()
  const { data: profile } = useMe()
  const classes = useMyClasses()
  const conversations = useTeacherConversations()
  const reply = useReply()
  const send = useMessageParent()
  const classIds = new Set((classes.data ?? []).map((classroom) => classroom.id))
  const students = useDemoStudents({})
  const pupils = (students.data ?? []).filter((row) => classIds.has(row.classroom.id))
  const [studentId, setStudentId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const selected = pupils.find((row) => row.student.id === studentId) ?? pupils[0]

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <DemoBanner />
        <h1 className="font-display text-2xl font-bold">{t('teacher.messages.title')}</h1>
      </div>
      {pupils.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                if (selected === undefined || subject.trim() === '' || body.trim() === '') return
                void send
                  .mutateAsync({ studentId: selected.student.id, subject, body })
                  .then((conversation) => {
                    toast(t('teacher.messages.sent', { name: conversation.guardianName }), {
                      tone: 'success',
                    })
                    setSubject('')
                    setBody('')
                  })
              }}
            >
              <h2 className="font-display text-lg font-semibold">{t('teacher.messages.new')}</h2>
              <Field
                label={t('teacher.messages.student')}
                hint={
                  selected === undefined
                    ? undefined
                    : t('teacher.messages.to', { name: selected.payer })
                }
              >
                {(control) => (
                  <NativeSelect
                    {...control}
                    value={selected?.student.id ?? ''}
                    onChange={(event) => {
                      setStudentId(event.target.value)
                    }}
                  >
                    {pupils.map((row) => (
                      <option key={row.student.id} value={row.student.id}>
                        {`${row.name} (${row.classroom.name})`}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
              <Field label={t('teacher.messages.subject')}>
                {(control) => (
                  <Input
                    {...control}
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
                    rows={3}
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
                disabled={subject.trim() === '' || body.trim() === '' || send.isPending}
              >
                <Send aria-hidden />
                {t('teacher.messages.send')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      <QueryState query={conversations}>
        {(list) => (
          <MobileConversations
            conversations={list}
            own="school"
            emptyLabel={t('teacher.messages.empty')}
            titleOf={(conversation) => `${conversation.guardianName} · ${conversation.childName}`}
            sending={reply.isPending}
            onReply={(conversationId, text) =>
              reply.mutateAsync({ conversationId, body: text, author: profile?.name ?? '' })
            }
          />
        )}
      </QueryState>
    </div>
  )
}
