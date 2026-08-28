import { Navigate, Outlet } from 'react-router-dom'
import { FullPageSpinner } from '../../components/FullPageSpinner'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const { user, status } = useAuth()

  if (status === 'loading') {
    return <FullPageSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
