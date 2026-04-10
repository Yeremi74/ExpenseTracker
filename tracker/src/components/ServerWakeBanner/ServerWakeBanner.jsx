import { useSyncExternalStore } from 'react'
import {
  getServerWaking,
  subscribeServerWake,
} from '../../api/serverWakeStore.js'
import styles from './ServerWakeBanner.module.css'

export default function ServerWakeBanner() {
  const waking = useSyncExternalStore(
    subscribeServerWake,
    getServerWaking,
    () => false
  )

  if (!waking) return null

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <p className={styles.text}>
        El servidor se está iniciando (plan gratuito con inactividad).
        Reintentando cada 5 segundos… Tu petición seguirá sola cuando el
        backend responda; no hace falta repetirla.
      </p>
    </div>
  )
}
