import styles from './EmptyState.module.css'

export default function EmptyState({ message }) {
  return <p className={styles.empty}>{message}</p>
}
