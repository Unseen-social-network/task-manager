import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Moon, Sun } from 'lucide-react'
import { useAuthStore } from '@/contexts/authStore'
import { useLocale } from '@/contexts/locale'
import { useTheme } from '@/contexts/theme'
import type { LoginCredentials } from '@/types'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export const LoginPage = () => {
  const navigate = useNavigate()
  const login = useAuthStore(state => state.login)
  const [isLoading, setIsLoading] = useState(false)
  const { locale, setLocale, t } = useLocale()
  const { theme, toggleTheme } = useTheme()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>()

  const onSubmit = async (data: LoginCredentials) => {
    setIsLoading(true)
    try {
      await login(data)
      toast.success(t('login.success'))
      navigate('/tasks')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('login.failure'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md dark:bg-gray-900">
        <div className="flex justify-end gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === 'en' ? 'ru' : 'en')}
            aria-label={t('nav.languageToggle')}
          >
            {t('nav.languageToggle')}
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label={t('nav.themeToggle')}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">{t('login.title')}</h1>
          <p className="text-gray-600 dark:text-gray-300">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={t('login.usernameLabel')}
            {...register('username', { required: t('login.usernameRequired') })}
            error={errors.username?.message}
            placeholder={t('login.usernamePlaceholder')}
          />

          <Input
            label={t('login.passwordLabel')}
            type="password"
            {...register('password', { required: t('login.passwordRequired') })}
            error={errors.password?.message}
            placeholder={t('login.passwordPlaceholder')}
          />

          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t('login.submit')}
          </Button>
        </form>

      </div>
    </div>
  )
}
