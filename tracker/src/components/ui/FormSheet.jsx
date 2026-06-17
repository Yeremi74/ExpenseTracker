import { useEffect, useRef } from 'react'
import styles from './FormSheet.module.css'

const FIRST_INPUT_SELECTOR =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'

export default function FormSheet({ open, onClose, title, children }) {
  const bodyRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const frameId = requestAnimationFrame(() => {
      bodyRef.current?.querySelector(FIRST_INPUT_SELECTOR)?.focus()
    })

    return () => cancelAnimationFrame(frameId)
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
        <div className={styles.body} ref={bodyRef}>
          {children}
        </div>
      </div>
    </>
  )
}
