import styles from './PageHeader.module.css'

export default function PageHeader({ title, compact }) {
  return (
    <header
      className={`${styles.header}${compact ? ` ${styles.compact}` : ''}`}
    >
      <h1 className={styles.title}>{title}</h1>
    </header>
  )
}
