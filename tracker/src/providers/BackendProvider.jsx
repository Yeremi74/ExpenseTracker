import { useEffect, useState } from 'react'
import BackendLoading from '../components/ui/BackendLoading.jsx'
import {
  getBackendStatus,
  initializeBackend,
  subscribeToBackendStatus,
} from '../api/backendWake.js'

export default function BackendProvider({ children }) {
  const [status, setStatus] = useState(getBackendStatus)

  useEffect(() => {
    return subscribeToBackendStatus(setStatus)
  }, [])

  useEffect(() => {
    void initializeBackend()
  }, [])

  const showLoading = status === 'checking' || status === 'waking'

  return (
    <>
      {children}
      {showLoading && <BackendLoading status={status} />}
    </>
  )
}
