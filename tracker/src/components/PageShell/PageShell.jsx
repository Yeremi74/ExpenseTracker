import styles from './PageShell.module.css'

export default function PageShell({ children }) {
  return <div className={styles.shell}>{children}</div>
}
