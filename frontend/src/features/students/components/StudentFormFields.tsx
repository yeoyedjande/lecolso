import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'

import { BLOOD_TYPES, RELATIONS } from '../api'
import type { GuardianValues, StudentFieldsValues } from '../enrollmentSchema'
import { useFieldMessage } from '../useFieldMessage'

/**
 * Champs du dossier élève (assistant d'inscription, modification).
 * Les champs médicaux ne sont affichés qu'à qui peut les saisir.
 */
export function StudentFields({
  field,
  errors,
  medical,
}: {
  /** Enregistre un champ du dossier dans le formulaire appelant (`register('student.<nom>')`). */
  field: (name: keyof StudentFieldsValues) => UseFormRegisterReturn
  errors: FieldErrors<StudentFieldsValues> | undefined
  medical: boolean
}) {
  const { t } = useTranslation()
  const message = useFieldMessage()

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Field label={t('enrollment.lastName')} error={message(errors?.lastName?.message)}>
        {(c) => <Input {...c} {...field('lastName')} autoComplete="off" />}
      </Field>
      <Field label={t('enrollment.firstName')} error={message(errors?.firstName?.message)}>
        {(c) => <Input {...c} {...field('firstName')} autoComplete="off" />}
      </Field>
      <Field label={t('enrollment.gender')} error={message(errors?.gender?.message)}>
        {(c) => (
          <NativeSelect {...c} {...field('gender')}>
            <option value="F">{t('students.detail.genders.F')}</option>
            <option value="M">{t('students.detail.genders.M')}</option>
          </NativeSelect>
        )}
      </Field>
      <Field label={t('enrollment.birthDate')} error={message(errors?.birthDate?.message)}>
        {(c) => <Input {...c} type="date" {...field('birthDate')} />}
      </Field>
      <Field
        label={t('enrollment.birthPlace')}
        hint={t('enrollment.optional')}
        error={message(errors?.birthPlace?.message)}
      >
        {(c) => <Input {...c} {...field('birthPlace')} autoComplete="off" />}
      </Field>
      <Field
        label={t('enrollment.district')}
        hint={t('enrollment.optional')}
        error={message(errors?.address?.message)}
      >
        {(c) => (
          <Input {...c} {...field('address')} placeholder={t('enrollment.districtPlaceholder')} />
        )}
      </Field>
      {medical && (
        <fieldset className="grid gap-4 rounded-2xl border p-4 md:col-span-2 md:grid-cols-2">
          <legend className="px-1 font-semibold">{t('enrollment.medical')}</legend>
          <p className="text-[13px] text-muted-foreground md:col-span-2">
            {t('enrollment.medicalHint')}
          </p>
          <Field label={t('enrollment.bloodType')} error={message(errors?.bloodType?.message)}>
            {(c) => (
              <NativeSelect {...c} {...field('bloodType')}>
                <option value="">{t('enrollment.bloodTypeUnknown')}</option>
                {BLOOD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label={t('enrollment.allergies')} error={message(errors?.allergies?.message)}>
            {(c) => <Input {...c} {...field('allergies')} autoComplete="off" />}
          </Field>
          <Field
            label={t('enrollment.medicalNotes')}
            error={message(errors?.medicalNotes?.message)}
            className="md:col-span-2"
          >
            {(c) => <Textarea {...c} rows={2} {...field('medicalNotes')} />}
          </Field>
        </fieldset>
      )}
    </div>
  )
}

/** Champs d'un tuteur (assistant d'inscription, panneau d'un tuteur). */
export function GuardianFields({
  field,
  errors,
}: {
  /** Enregistre un champ du tuteur dans le formulaire appelant (`register('guardians.<i>.<nom>')`). */
  field: (name: keyof GuardianValues) => UseFormRegisterReturn
  errors: FieldErrors<GuardianValues> | undefined
}) {
  const { t } = useTranslation()
  const message = useFieldMessage()

  return (
    <>
      <Field label={t('enrollment.guardianName')} error={message(errors?.name?.message)}>
        {(c) => <Input {...c} {...field('name')} autoComplete="off" />}
      </Field>
      <Field label={t('enrollment.relation')} error={message(errors?.relation?.message)}>
        {(c) => (
          <NativeSelect {...c} {...field('relation')}>
            {RELATIONS.map((relation) => (
              <option key={relation} value={relation}>
                {t(`enrollment.relations.${relation}`)}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field
        label={t('enrollment.phone')}
        hint={t('enrollment.phoneHint')}
        error={message(errors?.phone?.message)}
      >
        {(c) => <Input {...c} {...field('phone')} type="tel" inputMode="tel" autoComplete="off" />}
      </Field>
      <Field
        label={t('enrollment.email')}
        hint={t('enrollment.optional')}
        error={message(errors?.email?.message)}
      >
        {(c) => <Input {...c} {...field('email')} type="email" autoComplete="off" />}
      </Field>
      <Field
        label={t('enrollment.profession')}
        hint={t('enrollment.optional')}
        error={message(errors?.profession?.message)}
      >
        {(c) => <Input {...c} {...field('profession')} autoComplete="off" />}
      </Field>
    </>
  )
}
