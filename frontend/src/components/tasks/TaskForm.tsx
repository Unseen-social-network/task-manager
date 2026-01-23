import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { format, isValid, parseISO } from 'date-fns'
import type { CreateTaskInput, Contact, Project } from '@/types'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { contactsService } from '@/services/contacts.service'
import { projectsService } from '@/services/projects.service'
import { useLocale } from '@/contexts/localeContext'

interface TaskFormProps {
  initialData?: CreateTaskInput
  onSubmit: (data: CreateTaskInput) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export const TaskForm = ({ initialData, onSubmit, onCancel, isLoading }: TaskFormProps) => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [useContact, setUseContact] = useState(!!initialData?.contact)
  const { t, locale } = useLocale()
  const shouldShowProject = projects.length > 0

  const getDefaultDueDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setSeconds(0, 0)
    return format(tomorrow, "yyyy-MM-dd'T'HH:mm")
  }

  const formatDueDateForInput = (value?: string | null) => {
    if (!value) return value ?? undefined
    const parsed = parseISO(value)
    if (!isValid(parsed)) return value
    return format(parsed, "yyyy-MM-dd'T'HH:mm")
  }

  const formatContactLabel = (contact: Contact) => {
    if (!contact.username) return contact.name
    return `${contact.name} (@${contact.username})`
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTaskInput>({
    defaultValues: initialData
      ? {
          ...initialData,
          due_date: formatDueDateForInput(initialData.due_date),
        }
      : {
      urgency: 'medium',
      status: 'todo',
      due_date: getDefaultDueDate(),
        },
  })

  useEffect(() => {
    loadContacts()
    loadProjects()
  }, [])

  const loadContacts = async () => {
    try {
      const response = await contactsService.getContacts()
      setContacts(response.results)
    } catch (error) {
      console.error('Failed to load contacts:', error)
    }
  }

  const loadProjects = async () => {
    try {
      const response = await projectsService.getProjects()
      const ownedProjects = response.results.filter(project => project.is_owner)
      setProjects(ownedProjects)
    } catch (error) {
      console.error('Failed to load projects:', error)
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        lang={locale === 'ru' ? 'ru-RU' : 'en-GB'}
        {...register('due_date')}
        error={errors.due_date?.message}
      />

      {shouldShowProject && (
        <Select
          label={t('tasks.form.project')}
          {...register('project_id', { valueAsNumber: true })}
          options={[
            { value: '', label: t('tasks.form.projectPlaceholder') },
            ...projects.map(project => ({ value: String(project.id), label: project.name })),
          ]}
        />
      )}

      <div className="space-y-2">
        <Input
          label={t('tasks.form.taggedUser')}
          placeholder={t('tasks.form.taggedPlaceholder')}
          {...register('tagged_user')}
          error={errors.tagged_user?.message}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('tasks.form.taggedHint')}
        </p>
      </div>

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
            ...contacts.map(c => ({ value: String(c.id), label: formatContactLabel(c) })),
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
