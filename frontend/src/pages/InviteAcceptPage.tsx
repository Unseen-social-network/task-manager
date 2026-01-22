import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useLocale } from '@/contexts/localeContext'
import { useTheme } from '@/contexts/themeContext'
import { invitesService } from '@/services/invites.service'
import { getApiErrorMessage } from '@/utils/helpers'
import type { Invite, InviteAcceptInput } from '@/types'

type InviteFormValues = InviteAcceptInput & { confirm_password: string }

export const InviteAcceptPage = () => {
  const { t, locale, setLocale } = useLocale()
  const { theme, toggleTheme } = useTheme()
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [invite, setInvite] = useState<Invite | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<InviteFormValues>()

  const getPasswordValidationError = (password?: string): string | null => {
    if (!password) return t('invite.required')
    if (password.length < 8) return t('invite.passwordMin')
    if (!/[A-Z]/.test(password)) return t('invite.passwordUpper')
    if (!/[a-z]/.test(password)) return t('invite.passwordLower')
    if (!/[0-9]/.test(password)) return t('invite.passwordNumber')
    return null
  }

  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) return
      setLoadingInvite(true)
      try {
        const data = await invitesService.getInvite(token)
        setInvite(data)
      } catch {
        toast.error(t('invite.loadFail'))
      } finally {
        setLoadingInvite(false)
      }
    }

    fetchInvite()
  }, [token, t])

  const confirmError = useMemo(() => {
    const password = watch('password')
    const confirm = watch('confirm_password')
    if (!confirm) return undefined
    if (password !== confirm) {
      return t('invite.passwordMismatch')
    }
    return undefined
  }, [watch, t])

  const password = watch('password')
  const passwordStrength = useMemo(() => {
    const hasMin = password?.length >= 8
    const hasUpper = /[A-Z]/.test(password || '')
    const hasLower = /[a-z]/.test(password || '')
    const hasNumber = /[0-9]/.test(password || '')
    const hasSpecial = /[^A-Za-z0-9]/.test(password || '')
    const hasLong = password?.length >= 16
    const meetsBase = hasMin && hasUpper && hasLower && hasNumber

    if (!meetsBase) {
      return {
        percent: 33,
        label: t('invite.passwordStrengthWeak'),
        color: 'bg-red-500',
      }
    }

    if (hasLong && hasSpecial) {
      return {
        percent: 100,
        label: t('invite.passwordStrengthStrong'),
        color: 'bg-green-500',
      }
    }

    return {
      percent: 66,
      label: t('invite.passwordStrengthMedium'),
      color: 'bg-yellow-500',
    }
  }, [password, t])

  const handleAccept = async (data: InviteFormValues) => {
    if (!token) return
    const passwordError = getPasswordValidationError(data.password)
    if (passwordError) {
      toast.error(passwordError)
      return
    }
    if (data.password !== data.confirm_password) {
      toast.error(t('invite.passwordMismatch'))
      return
    }
    setSubmitting(true)
    try {
      await invitesService.acceptInvite(token, {
        username: data.username,
        full_name: data.full_name,
        password: data.password,
      })
      toast.success(t('invite.success'))
      navigate('/login')
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, t('invite.fail'))
      const resolvedMessage =
        errorMessage === 'User with this email already exists.'
          ? t('invite.emailExists')
          : errorMessage
      toast.error(resolvedMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const invitedBy =
    invite?.invited_by_full_name || invite?.invited_by_username || 'System32'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-lg shadow p-8 space-y-6">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === 'en' ? 'ru' : 'en')}
            aria-label={t('nav.languageToggle')}
          >
            {t('nav.languageToggle')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            aria-label={t('nav.themeToggle')}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </Button>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('invite.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('invite.subtitle')}
          </p>
          {invitedBy && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('invite.invitedBy')} {invitedBy}
            </p>
          )}
        </div>

        {loadingInvite ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('invite.loading')}</p>
        ) : invite?.status !== 'pending' ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('invite.inactive')}
            </p>
            <Button onClick={() => navigate('/login')}>{t('invite.backToLogin')}</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(handleAccept)} className="space-y-4">
            <Input
              label={t('invite.username')}
              {...register('username', { required: t('invite.required') })}
              error={errors.username?.message}
              placeholder="nikita"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('invite.usernameHint')}
            </p>
            <Input
              label={t('invite.fullName')}
              {...register('full_name', { required: t('invite.required') })}
              error={errors.full_name?.message}
              placeholder={t('invite.fullNamePlaceholder')}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('invite.fullNameHint')}
            </p>
            <Input
              label={t('invite.password')}
              type="password"
              {...register('password', {
                validate: value => getPasswordValidationError(value) ?? true,
              })}
              error={errors.password?.message}
            />
            <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <p>{t('invite.passwordRequirements')}</p>
              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                  style={{ width: `${passwordStrength.percent}%` }}
                />
              </div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">
                {t('invite.passwordStrengthLabel')} {passwordStrength.label}
              </p>
            </div>
            <Input
              label={t('invite.passwordConfirm')}
              type="password"
              {...register('confirm_password', { required: t('invite.required') })}
              error={errors.confirm_password?.message || confirmError}
            />
            <div className="flex justify-end">
              <Button type="submit" isLoading={submitting}>
                {t('invite.submit')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
