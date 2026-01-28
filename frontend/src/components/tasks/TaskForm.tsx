import { useEffect, useMemo, useState, type FocusEvent } from 'react'
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
  const [useContact, setUseContact] = useState(
    Boolean(initialData?.contacts?.length || initialData?.contact)
  )
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
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
    setValue,
    watch,
  } = useForm<CreateTaskInput>({
    defaultValues: initialData
      ? {
          ...initialData,
          contacts:
            initialData.contacts ??
            (typeof initialData.contact === 'number' ? [initialData.contact] : []),
          tagged_users:
            initialData.tagged_users ??
            (initialData.tagged_user ? [initialData.tagged_user] : []),
          due_date: formatDueDateForInput(initialData.due_date),
        }
      : {
          urgency: 'medium',
          status: 'todo',
          due_date: getDefaultDueDate(),
        },
  })

  useEffect(() => {
    register('tagged_users')
    register('contacts')
  }, [register])

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

  const taggedUsers = watch('tagged_users') ?? []
  const selectedContacts = watch('contacts') ?? []
  const taggableContacts = useMemo(
    () => contacts.filter(contact => contact.username),
    [contacts]
  )
  const filteredTaggableContacts = useMemo(() => {
    const normalizedQuery = tagSearch.trim().toLowerCase()
    if (!normalizedQuery) return taggableContacts
    return taggableContacts.filter(contact => {
      const nameMatch = contact.name.toLowerCase().includes(normalizedQuery)
      const usernameMatch = contact.username?.toLowerCase().includes(normalizedQuery)
      const labelMatch = formatContactLabel(contact).toLowerCase().includes(normalizedQuery)
      return nameMatch || usernameMatch || labelMatch
    })
  }, [tagSearch, taggableContacts])

  const handleTaggedUserSelect = (username: string) => {
    if (taggedUsers.includes(username)) return
    setValue('tagged_users', [...taggedUsers, username], {
      shouldDirty: true,
      shouldTouch: true,
    })
    setTagSearch('')
    setIsTagMenuOpen(false)
  }

  const handleTaggedUserRemove = (username: string) => {
    setValue(
      'tagged_users',
      taggedUsers.filter(user => user !== username),
      { shouldDirty: true, shouldTouch: true }
    )
  }

  const handleTaggedUserBlur = (event: FocusEvent<HTMLInputElement>) => {
    const enteredValue = event.target.value.trim()
    if (enteredValue) {
      const matchedContact = taggableContacts.find(contact => {
        const nameMatch = contact.name.toLowerCase() === enteredValue.toLowerCase()
        const usernameMatch = contact.username?.toLowerCase() === enteredValue.toLowerCase()
        const labelMatch =
          formatContactLabel(contact).toLowerCase() === enteredValue.toLowerCase()
        return nameMatch || usernameMatch || labelMatch
      })
      const username = matchedContact?.username ?? enteredValue
      if (username && !taggedUsers.includes(username)) {
        setValue('tagged_users', [...taggedUsers, username], {
          shouldDirty: true,
          shouldTouch: true,
        })
      }
      setTagSearch('')
    }
    setTimeout(() => setIsTagMenuOpen(false), 100)
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

      <div className="space-y-2 relative">
        <div className="flex flex-wrap gap-2">
          {taggedUsers.map(username => (
            <span
              key={username}
              className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              @{username}
              <button
                type="button"
                onClick={() => handleTaggedUserRemove(username)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                aria-label={t('tasks.form.taggedRemove')}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <Input
          label={t('tasks.form.taggedUser')}
          placeholder={t('tasks.form.taggedPlaceholder')}
          autoComplete="off"
          value={tagSearch}
          onFocus={() => setIsTagMenuOpen(true)}
          onChange={event => {
            setTagSearch(event.target.value)
            setIsTagMenuOpen(true)
          }}
          onBlur={handleTaggedUserBlur}
          error={errors.tagged_users?.message as string | undefined}
        />
        {isTagMenuOpen && filteredTaggableContacts.length > 0 && (
          <div className="absolute z-20 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <ul className="max-h-48 overflow-y-auto py-1 text-sm text-gray-700 dark:text-gray-200">
              {filteredTaggableContacts.map(contact => (
                <li key={contact.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                    onMouseDown={event => {
                      event.preventDefault()
                      if (contact.username) {
                          handleTaggedUserSelect(contact.username)
                        }
                      }}
                  >
                    <span className="font-medium">{contact.name}</span>
                    {contact.username && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        @{contact.username}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
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
            onChange={() => {
              setUseContact(true)
              setValue('contact_freeform', '')
            }}
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
            onChange={() => {
              setUseContact(false)
              setValue('contacts', [])
              setValue('contact', null)
            }}
            className="text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-200">
            {t('tasks.form.manualContact')}
          </span>
        </label>
      </div>

      {useContact ? (
        <Select
          label={t('tasks.form.contacts')}
          multiple
          value={selectedContacts.map(String)}
          onChange={event => {
            const values = Array.from(event.target.selectedOptions)
              .map(option => Number(option.value))
              .filter(value => Number.isFinite(value))
            setValue('contacts', values, {
              shouldDirty: true,
              shouldTouch: true,
            })
            setValue('contact', values[0] ?? null, {
              shouldDirty: true,
              shouldTouch: true,
            })
          }}
          className="min-h-[140px]"
          options={[
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
      {useContact && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('tasks.form.contactsHint')}
        </p>
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
