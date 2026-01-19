import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { CreateTaskInput, Contact } from '@/types'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { contactsService } from '@/services/contacts.service'

interface TaskFormProps {
  initialData?: CreateTaskInput
  onSubmit: (data: CreateTaskInput) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export const TaskForm = ({ initialData, onSubmit, onCancel, isLoading }: TaskFormProps) => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [useContact, setUseContact] = useState(!!initialData?.contact)

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
        label="Title"
        {...register('title', { required: 'Title is required' })}
        error={errors.title?.message}
      />

      <Textarea
        label="Description"
        rows={4}
        {...register('description')}
        error={errors.description?.message}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Urgency"
          {...register('urgency')}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'critical', label: 'Critical' },
          ]}
        />

        <Select
          label="Status"
          {...register('status')}
          options={[
            { value: 'todo', label: 'To Do' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'done', label: 'Done' },
            { value: 'canceled', label: 'Canceled' },
          ]}
        />
      </div>

      <Input
        label="Due Date"
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
          <span className="text-sm">Use contact from book</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={!useContact}
            onChange={() => setUseContact(false)}
            className="text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm">Enter contact manually</span>
        </label>
      </div>

      {useContact ? (
        <Select
          label="Contact"
          {...register('contact', { valueAsNumber: true })}
          options={[
            { value: '', label: 'Select a contact' },
            ...contacts.map(c => ({ value: String(c.id), label: c.name })),
          ]}
        />
      ) : (
        <Input
          label="Contact (Freeform)"
          placeholder="e.g., Call John at +1234567890"
          {...register('contact_freeform')}
          error={errors.contact_freeform?.message}
        />
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initialData ? 'Update' : 'Create'} Task
        </Button>
      </div>
    </form>
  )
}
