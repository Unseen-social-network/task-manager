import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { LoginPage } from '@/pages/LoginPage'
import { TasksPage } from '@/pages/TasksPage'
import { ContactsPage } from '@/pages/ContactsPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { InviteAcceptPage } from '@/pages/InviteAcceptPage'
import { PrivateRoute } from '@/components/PrivateRoute'
import { api } from '@/services/api'

function App() {
  useEffect(() => {
    type MetrikaFunction = ((
      id: number,
      method: string,
      ...args: unknown[]
    ) => void) & {
      a?: unknown[][]
      l?: number
    }

    const parseMetrikaId = (value: unknown): number | null => {
      const id = Number(value)
      if (!Number.isFinite(id) || id <= 0) return null
      return id
    }

    const initMetrika = (metrikaId: number) => {
      const ym: MetrikaFunction =
        window.ym ??
        ((id: number, method: string, ...args: unknown[]) => {
          ym.a = ym.a ?? []
          ym.a.push([id, method, ...args])
        })
      window.ym = ym
      ym.l = Date.now()

      if (!document.getElementById('yandex-metrika')) {
        const script = document.createElement('script')
        script.id = 'yandex-metrika'
        script.async = true
        script.src = 'https://mc.yandex.ru/metrika/tag.js'
        document.head.appendChild(script)
      }

      ym(metrikaId, 'init', {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: true,
      })

      if (!document.getElementById('yandex-metrika-noscript')) {
        const noscript = document.createElement('noscript')
        noscript.id = 'yandex-metrika-noscript'
        noscript.innerHTML = `<div><img src="https://mc.yandex.ru/watch/${metrikaId}" style="position:absolute; left:-9999px;" alt="" /></div>`
        document.body.appendChild(noscript)
      }
    }

    const envMetrikaId = parseMetrikaId(import.meta.env.VITE_YANDEX_METRIKA_ID)
    if (envMetrikaId) {
      initMetrika(envMetrikaId)
      return
    }

    let cancelled = false
    api
      .get('/api/v1/public/analytics-settings/')
      .then(response => {
        if (cancelled) return
        const { yandex_metrika_id: metrikaId, enabled } = response.data ?? {}
        if (enabled === false) return
        const parsedId = parseMetrikaId(metrikaId)
        if (parsedId) {
          initMetrika(parsedId)
        }
      })
      .catch(() => {
        // Silently ignore analytics configuration errors.
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
        <Route
          path="/tasks"
          element={
            <PrivateRoute>
              <TasksPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <SettingsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/contacts"
          element={
            <PrivateRoute>
              <ContactsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <PrivateRoute>
              <ProjectsPage />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/tasks" replace />} />
        <Route path="*" element={<Navigate to="/tasks" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
