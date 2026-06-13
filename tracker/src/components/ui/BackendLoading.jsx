import styles from './BackendLoading.module.css'

const messages = {
  checking: 'Conectando con el servidor...',
  waking: 'Activando servidor, esto puede tardar unos segundos...',
}

export default function BackendLoading({ status = 'checking' }) {
  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>◆</span>
          <span className={styles.brandName}>Tracker</span>
        </div>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.message}>{messages[status] || messages.checking}</p>
      </div>
    </div>
  )
}
