import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { translations, type Locale } from '@/utils/translations'
import { LocaleContext } from '@/contexts/localeContext'

const STORAGE_KEY = 'app_locale'

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored && translations[stored]) {
      setLocaleState(stored)
    }
  }, [])

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
    localStorage.setItem(STORAGE_KEY, nextLocale)
  }, [])

  const t = useCallback(
    (key: string) => {
      return translations[locale][key] ?? key
    },
    [locale]
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
