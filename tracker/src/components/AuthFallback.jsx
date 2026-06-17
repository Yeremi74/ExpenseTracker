import { Navigate } from 'react-router-dom'
import BackendLoading from './ui/BackendLoading.jsx'
import { useAuth } from '../providers/AuthProvider.jsx'

export default function AuthFallback() {
  const { user, loading } = useAuth()

  if (loading) {
    return <BackendLoading />
  }

  return <Navigate to={user ? '/' : '/login'} replace />
}
