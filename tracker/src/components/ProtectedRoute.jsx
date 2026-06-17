import { Navigate, Outlet } from 'react-router-dom'
import BackendLoading from './ui/BackendLoading.jsx'
import { useAuth } from '../../providers/AuthProvider.jsx'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <BackendLoading />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
