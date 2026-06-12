import { formatCurrency } from '../../utils/format.js'
import styles from './StatCard.module.css'

const tones = {
  default: styles.toneDefault,
  positive: styles.tonePositive,
  negative: styles.toneNegative,
  warning: styles.toneWarning,
}

export default function StatCard({ label, value, tone = 'default', isCurrency = true }) {
  const display = isCurrency ? formatCurrency(value) : value
  return (
    <div className={`${styles.stat} ${tones[tone]}`}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{display}</span>
    </div>
  )
}
