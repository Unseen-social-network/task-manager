import { useForm } from 'react-hook-form'
import type { CreateContactInput } from '@/types'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/contexts/locale'

interface ContactFormProps {
  initialData?: CreateContactInput
  onSubmit: (data: CreateContactInput) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export const ContactForm = ({ initialData, onSubmit, onCancel, isLoading }: ContactFormProps) => {
  const { t } = useLocale()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateContactInput>({
    defaultValues: initialData,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label={t('contacts.form.name')}
        {...register('name', { required: t('contacts.form.nameRequired') })}
        error={errors.name?.message}
        placeholder="John Doe"
      />

      <Input
        label={t('contacts.form.company')}
        {...register('company')}
        error={errors.company?.message}
        placeholder="ACME Corp"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('contacts.form.phone')}
          type="tel"
          {...register('phone')}
          error={errors.phone?.message}
          placeholder="+1234567890"
        />

        <Input
          label={t('contacts.form.email')}
          type="email"
          {...register('email')}
          error={errors.email?.message}
          placeholder="john@example.com"
        />
      </div>

      <Input
        label={t('contacts.form.telegram')}
        {...register('telegram')}
        error={errors.telegram?.message}
        placeholder="@johndoe"
      />

      <Textarea
        label={t('contacts.form.notes')}
        rows={4}
        {...register('notes')}
        error={errors.notes?.message}
        placeholder={t('contacts.form.notesPlaceholder')}
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('contacts.form.cancel')}
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initialData ? t('contacts.form.update') : t('contacts.form.create')}
        </Button>
      </div>
    </form>
  )
}
