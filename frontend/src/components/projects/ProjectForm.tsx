import { useForm, useFieldArray } from 'react-hook-form'
import type { CreateProjectInput } from '@/types'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/contexts/localeContext'

interface ProjectFormProps {
  initialData?: CreateProjectInput
  onSubmit: (data: CreateProjectInput) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export const ProjectForm = ({ initialData, onSubmit, onCancel, isLoading }: ProjectFormProps) => {
  const { t } = useLocale()
  const defaultLinks =
    initialData?.links && initialData.links.length > 0
      ? initialData.links
      : [{ label: '', url: '' }]

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      phone: initialData?.phone ?? '',
      links: defaultLinks,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'links',
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label={t('projects.form.name')}
        {...register('name', { required: t('projects.form.nameRequired') })}
        error={errors.name?.message}
      />

      <Textarea
        label={t('projects.form.description')}
        rows={4}
        {...register('description')}
        error={errors.description?.message}
      />

      <Input
        label={t('projects.form.phone')}
        {...register('phone')}
        error={errors.phone?.message}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {t('projects.form.links')}
          </h4>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => append({ label: '', url: '' })}
          >
            {t('projects.form.addLink')}
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label={t('projects.form.linkLabel')}
                {...register(`links.${index}.label` as const)}
              />
              <div className="flex items-end gap-2">
                <Input
                  label={t('projects.form.linkUrl')}
                  {...register(`links.${index}.url` as const)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(index)}
                >
                  {t('projects.form.removeLink')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('projects.form.cancel')}
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initialData ? t('projects.form.update') : t('projects.form.create')}
        </Button>
      </div>
    </form>
  )
}
