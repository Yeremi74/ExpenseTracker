import { Navigate, Outlet } from 'react-router-dom'
import BackendLoading from './ui/BackendLoading.jsx'
import { useAuth } from '../providers/AuthProvider.jsx'

export default function GuestRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <BackendLoading />
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
