import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { CreateTaskInput, Contact } from '@/types'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { contactsService } from '@/services/contacts.service'
import { useLocale } from '@/contexts/locale'

interface TaskFormProps {
  initialData?: CreateTaskInput
  onSubmit: (data: CreateTaskInput) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export const TaskForm = ({ initialData, onSubmit, onCancel, isLoading }: TaskFormProps) => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [useContact, setUseContact] = useState(!!initialData?.contact)
  const { t } = useLocale()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTaskInput>({
    defaultValues: initialData || {
      urgency: 'medium',
      status: 'todo',
    },
  })

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    try {
      const response = await contactsService.getContacts()
      setContacts(response.results)
    } catch (error) {
      console.error('Failed to load contacts:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label={t('tasks.form.title')}
        {...register('title', { required: t('tasks.form.titleRequired') })}
        error={errors.title?.message}
      />

      <Textarea
        label={t('tasks.form.description')}
        rows={4}
        {...register('description')}
        error={errors.description?.message}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label={t('tasks.form.urgency')}
          {...register('urgency')}
          options={[
            { value: 'low', label: t('urgency.low') },
            { value: 'medium', label: t('urgency.medium') },
            { value: 'high', label: t('urgency.high') },
            { value: 'critical', label: t('urgency.critical') },
          ]}
        />

        <Select
          label={t('tasks.form.status')}
          {...register('status')}
          options={[
            { value: 'todo', label: t('status.todo') },
            { value: 'in_progress', label: t('status.in_progress') },
            { value: 'done', label: t('status.done') },
            { value: 'canceled', label: t('status.canceled') },
          ]}
        />
      </div>

      <Input
        label={t('tasks.form.dueDate')}
        type="datetime-local"
        {...register('due_date')}
        error={errors.due_date?.message}
      />

      {/* Contact selection toggle */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={useContact}
            onChange={() => setUseContact(true)}
            className="text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-200">
            {t('tasks.form.useBookContact')}
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={!useContact}
            onChange={() => setUseContact(false)}
            className="text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-200">
            {t('tasks.form.manualContact')}
          </span>
        </label>
      </div>

      {useContact ? (
        <Select
          label={t('tasks.form.contact')}
          {...register('contact', { valueAsNumber: true })}
          options={[
            { value: '', label: t('tasks.form.contactSelect') },
            ...contacts.map(c => ({ value: String(c.id), label: c.name })),
          ]}
        />
      ) : (
        <Input
          label={t('tasks.form.contactFreeform')}
          placeholder={t('tasks.form.contactPlaceholder')}
          {...register('contact_freeform')}
          error={errors.contact_freeform?.message}
        />
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('tasks.form.cancel')}
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initialData ? t('tasks.form.update') : t('tasks.form.create')}
        </Button>
      </div>
    </form>
  )
}
