import styles from './SyncBanner.module.css'

const variantClass = {
  info: styles.info,
  warn: styles.warn,
}

export default function SyncBanner({ variant = 'info', children, role = 'status' }) {
  const className = variantClass[variant] ?? styles.info
  return (
    <p className={className} role={role}>
      {children}
    </p>
  )
}
