import { useForm } from 'react-hook-form'
import type { CreateContactInput } from '@/types'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'

interface ContactFormProps {
  initialData?: CreateContactInput
  onSubmit: (data: CreateContactInput) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export const ContactForm = ({ initialData, onSubmit, onCancel, isLoading }: ContactFormProps) => {
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
        label="Name"
        {...register('name', { required: 'Name is required' })}
        error={errors.name?.message}
        placeholder="John Doe"
      />

      <Input
        label="Company"
        {...register('company')}
        error={errors.company?.message}
        placeholder="ACME Corp"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Phone"
          type="tel"
          {...register('phone')}
          error={errors.phone?.message}
          placeholder="+1234567890"
        />

        <Input
          label="Email"
          type="email"
          {...register('email')}
          error={errors.email?.message}
          placeholder="john@example.com"
        />
      </div>

      <Input
        label="Telegram"
        {...register('telegram')}
        error={errors.telegram?.message}
        placeholder="@johndoe"
      />

      <Textarea
        label="Notes"
        rows={4}
        {...register('notes')}
        error={errors.notes?.message}
        placeholder="Additional information..."
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initialData ? 'Update' : 'Create'} Contact
        </Button>
      </div>
    </form>
  )
}
