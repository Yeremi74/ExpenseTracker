import styles from './AlertBanner.module.css'

const levelStyles = {
  critical: styles.critical,
  warning: styles.warning,
  info: styles.info,
}

export default function AlertBanner({ alerts }) {
  if (!alerts?.length) return null

  return (
    <div className={styles.list}>
      {alerts.map((alert, index) => (
        <div
          key={`${alert.type}-${alert.categoryId || alert.debtId || index}`}
          className={`${styles.alert} ${levelStyles[alert.level]}`}
        >
          <span className={styles.message}>{alert.message}</span>
          {alert.budget != null && (
            <span className={styles.detail}>
              {Math.round(alert.usage * 100)}% usado
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
