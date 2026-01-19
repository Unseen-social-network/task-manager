import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { LoginPage } from '@/pages/LoginPage'
import { TasksPage } from '@/pages/TasksPage'
import { ContactsPage } from '@/pages/ContactsPage'
import { PrivateRoute } from '@/components/PrivateRoute'

function App() {
  useEffect(() => {
    const metrikaEnvId = import.meta.env.VITE_YANDEX_METRIKA_ID
    if (!metrikaEnvId) return
    const metrikaId = Number(metrikaEnvId)
    if (!Number.isFinite(metrikaId)) return

    if (!window.ym) {
      window.ym = function (...args: unknown[]) {
        ;(window.ym as any).a = (window.ym as any).a || []
        ;(window.ym as any).a.push(args)
      } as any
      ;(window.ym as any).l = Date.now()
    }

    if (!document.getElementById('yandex-metrika')) {
      const script = document.createElement('script')
      script.id = 'yandex-metrika'
      script.async = true
      script.src = 'https://mc.yandex.ru/metrika/tag.js'
      document.head.appendChild(script)
    }

    window.ym(metrikaId, 'init', {
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
        <Route
          path="/tasks"
          element={
            <PrivateRoute>
              <TasksPage />
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
        <Route path="/" element={<Navigate to="/tasks" replace />} />
        <Route path="*" element={<Navigate to="/tasks" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
