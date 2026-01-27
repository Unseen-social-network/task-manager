import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { LoginPage } from '@/pages/LoginPage'
import { TasksPage } from '@/pages/TasksPage'
import { ContactsPage } from '@/pages/ContactsPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { InviteAcceptPage } from '@/pages/InviteAcceptPage'
import { StatisticsPage } from '@/pages/StatisticsPage'
import { PrivateRoute } from '@/components/PrivateRoute'
import { siteSettingsService } from '@/services/siteSettings.service'

const injectHeadHtml = (headHtml: string) => {
  const template = document.createElement('template')
  template.innerHTML = headHtml
  const appendedNodes: Element[] = []

  template.content.childNodes.forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return
    }
    const element = node as HTMLElement

    if (element.tagName === 'SCRIPT') {
      const scriptElement = element as HTMLScriptElement
      const script = document.createElement('script')
      scriptElement.getAttributeNames().forEach(attr => {
        const value = scriptElement.getAttribute(attr)
        if (value !== null) {
          script.setAttribute(attr, value)
        }
      })
      script.text = scriptElement.text
      document.head.appendChild(script)
      appendedNodes.push(script)
      return
    }

    const cloned = element.cloneNode(true) as Element
    document.head.appendChild(cloned)
    appendedNodes.push(cloned)
  })

  return () => {
    appendedNodes.forEach(node => node.remove())
  }
}

function App() {
  useEffect(() => {
    const metrikaEnvId = import.meta.env.VITE_YANDEX_METRIKA_ID
    if (!metrikaEnvId) return
    const metrikaId = Number(metrikaEnvId)
    if (!Number.isFinite(metrikaId)) return

    type MetrikaFunction = ((
      id: number,
      method: string,
      ...args: unknown[]
    ) => void) & {
      a?: unknown[][]
      l?: number
    }
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
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return

    let cleanup = () => {}

    const loadSiteSettings = async () => {
      try {
        const { head_html: headHtml } = await siteSettingsService.getSiteSettings()
        if (!headHtml.trim()) return
        cleanup = injectHeadHtml(headHtml)
      } catch (error) {
        console.error('Failed to load site settings', error)
      }
    }

    void loadSiteSettings()

    return () => {
      cleanup()
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
        <Route
          path="/statistics"
          element={
            <PrivateRoute>
              <StatisticsPage />
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
