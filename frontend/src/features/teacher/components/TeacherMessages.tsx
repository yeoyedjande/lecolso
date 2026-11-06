import { Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ClassPicker } from '@/components/ClassPicker'
import { QueryState } from '@/components/states/QueryState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useConversations, useStartConversation } from '@/features/messaging/api'
import { MobileConversations } from '@/features/messaging/components/MobileConversations'
import { useStudentFile, useStudentList } from '@/features/students/api'
import { ConflictError } from '@/lib/api/errors'
import { toast } from '@/lib/toast'

import { useTeacherClasses } from '../api'

/** Nouveau message à un parent d'un élève de ses classes. */
function NewMessage() {
  const { t } = useTranslation()
  const classes = useTeacherClasses()
  const [classroomId, setClassroomId] = useState('')
  const classroom =
    (classes.data ?? []).find((candidate) => candidate.id === classroomId) ?? classes.data?.[0]
  const students = useStudentList({
    search: '',
    cycleId: null,
    classroomId: classroom?.id ?? null,
    status: 'active',
  })
  const pupils = students.data?.pages.flatMap((page) => page.data) ?? []
  const [studentId, setStudentId] = useState('')
  const pupil = pupils.find((row) => row.id === studentId) ?? pupils[0]
  const file = useStudentFile(pupil?.id ?? '')
  const guardians = file.data?.guardians ?? []
  const [guardianId, setGuardianId] = useState('')
  const guardian = guardians.find((candidate) => candidate.id === guardianId) ?? guardians[0]
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const send = useStartConversation()

  if (classroom === undefined || pupils.length === 0) return null

  return (
    <Card>
      <CardContent className="p-4">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (pupil === undefined || guardian === undefined) return
            send
              .mutateAsync({
                studentId: pupil.id,
                guardianId: guardian.id,
                channel: 'teacher',
                subject: subject.trim(),
                body: body.trim(),
              })
              .then(() => {
                toast(t('teacher.messages.sent', { name: guardian.name }), { tone: 'success' })
                setSubject('')
                setBody('')
              })
              .catch((caught: unknown) => {
                toast(caught instanceof ConflictError ? caught.message : t('common.error'), {
                  tone: 'error',
                })
              })
          }}
        >
          <h2 className="font-display text-lg font-semibold">{t('teacher.messages.new')}</h2>
          {(classes.data ?? []).length > 1 && (
            <ClassPicker
              classrooms={classes.data ?? []}
              value={classroom.id}
              onChange={(id) => {
                setClassroomId(id)
                setStudentId('')
                setGuardianId('')
              }}
            />
          )}
          <Field label={t('teacher.messages.student')}>
            {(control) => (
              <NativeSelect
                {...control}
                value={pupil?.id ?? ''}
                onChange={(event) => {
                  setStudentId(event.target.value)
                  setGuardianId('')
                }}
              >
                {pupils.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.full_name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label={t('teacher.messages.guardian')}>
            {(control) => (
              <NativeSelect
                {...control}
                value={guardian?.id ?? ''}
                disabled={guardians.length === 0}
                onChange={(event) => {
                  setGuardianId(event.target.value)
                }}
              >
                {guardians.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {`${candidate.name} (${t(`enrollment.relations.${candidate.relation}`)})`}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label={t('teacher.messages.subject')}>
            {(control) => (
              <Input
                {...control}
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
            disabled={
              guardian === undefined ||
              subject.trim().length < 2 ||
              body.trim() === '' ||
              send.isPending
            }
          >
            <Send aria-hidden />
            {t('teacher.messages.send')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

/** Messages aux parents des élèves de ses classes : nouveaux messages et suite des échanges. */
export function TeacherMessages() {
  const { t } = useTranslation()
  const conversations = useConversations()

  return (
    <div className="grid gap-5">
      <h1 className="font-display text-2xl font-bold">{t('teacher.messages.title')}</h1>
      <NewMessage />
      <QueryState query={conversations}>
        {(list) => (
          <MobileConversations
            conversations={list}
            emptyLabel={t('teacher.messages.empty')}
            titleOf={(conversation) =>
              `${conversation.guardian.name} · ${conversation.student.first_name}`
            }
          />
        )}
      </QueryState>
    </div>
  )
}
