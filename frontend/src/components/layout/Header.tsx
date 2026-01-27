import { LogOut, Moon, Sun, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/contexts/authStore'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/contexts/localeContext'
import { useTheme } from '@/contexts/themeContext'

export const Header = () => {
  const navigate = useNavigate()
  const logout = useAuthStore(state => state.logout)
  const username = useAuthStore(state => state.username)
  const { locale, setLocale, t } = useLocale()
  const { theme, toggleTheme } = useTheme()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-between items-center gap-3 py-3 sm:h-16 sm:flex-nowrap">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary-600">{t('app.title')}</h1>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <button
              onClick={() => navigate('/tasks')}
              className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors dark:text-gray-200 dark:hover:text-primary-400"
            >
              {t('nav.tasks')}
            </button>
            <button
              onClick={() => navigate('/projects')}
              className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors dark:text-gray-200 dark:hover:text-primary-400"
            >
              {t('nav.projects')}
            </button>
            <button
              onClick={() => navigate('/contacts')}
              className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors dark:text-gray-200 dark:hover:text-primary-400"
            >
              {t('nav.contacts')}
            </button>
            <button
              onClick={() => navigate('/statistics')}
              className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors dark:text-gray-200 dark:hover:text-primary-400"
            >
              {t('nav.statistics')}
            </button>
          </nav>

          {/* User menu */}
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200 sm:text-sm hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="max-w-[140px] truncate sm:max-w-none">
                {username || t('nav.userFallback')}
              </span>
            </button>
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
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
        <nav className="flex md:hidden gap-2 pb-3 overflow-x-auto">
          <button
            onClick={() => navigate('/tasks')}
            className="whitespace-nowrap text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors dark:text-gray-200 dark:hover:text-primary-400"
          >
            {t('nav.tasks')}
          </button>
          <button
            onClick={() => navigate('/projects')}
            className="whitespace-nowrap text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors dark:text-gray-200 dark:hover:text-primary-400"
          >
            {t('nav.projects')}
          </button>
          <button
            onClick={() => navigate('/contacts')}
            className="whitespace-nowrap text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors dark:text-gray-200 dark:hover:text-primary-400"
          >
            {t('nav.contacts')}
          </button>
          <button
            onClick={() => navigate('/statistics')}
            className="whitespace-nowrap text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors dark:text-gray-200 dark:hover:text-primary-400"
          >
            {t('nav.statistics')}
          </button>
        </nav>
      </div>
    </header>
  )
}
