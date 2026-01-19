import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/contexts/authStore'

export const useAuth = (requireAuth = true) => {
  const navigate = useNavigate()
  const { isAuthenticated, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      navigate('/login')
    } else if (!requireAuth && isAuthenticated) {
      navigate('/tasks')
    }
  }, [isAuthenticated, requireAuth, navigate])

  return { isAuthenticated }
}
