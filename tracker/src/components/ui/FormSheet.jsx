import { useEffect } from 'react'
import styles from './FormSheet.module.css'

const MOBILE_QUERY = '(max-width: 768px)'

export default function FormSheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined

    const mediaQuery = window.matchMedia(MOBILE_QUERY)

    function syncScrollLock() {
      document.body.style.overflow = mediaQuery.matches ? 'hidden' : ''
    }

    syncScrollLock()
    mediaQuery.addEventListener('change', syncScrollLock)

    return () => {
      document.body.style.overflow = ''
      mediaQuery.removeEventListener('change', syncScrollLock)
    }
  }, [open])

  if (!open) return null

  return (
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-sheet-title"
      >
        <div className={styles.header}>
          <h3 id="form-sheet-title" className={styles.title}>
            {title}
          </h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </>
  )
}
