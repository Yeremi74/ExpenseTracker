import PageShell from '../PageShell/PageShell.jsx'
import SyncBanner from '../SyncBanner/SyncBanner.jsx'
import styles from './AuthSessionLoading.module.css'

export default function AuthSessionLoading({ message }) {
  return (
    <PageShell>
      <div className={styles.authLoading}>
        <SyncBanner variant="info">{message}</SyncBanner>
      </div>
    </PageShell>
  )
}
