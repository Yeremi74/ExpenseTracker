import { CURRENCIES, convertFromVes } from '../../utils/currency.js'
import { formatAmount } from '../../utils/format.js'
import styles from './MultiCurrencyStatCard.module.css'

const tones = {
  default: styles.toneDefault,
  positive: styles.tonePositive,
  negative: styles.toneNegative,
  warning: styles.toneWarning,
}

export default function MultiCurrencyStatCard({ label, amountVes, rates, tone = 'default' }) {
  return (
    <div className={`${styles.stat} ${tones[tone]}`}>
      <span className={styles.label}>{label}</span>
      <div className={styles.values}>
        {CURRENCIES.map(({ value: currency }, index) => (
          <span
            key={currency}
            className={index === 0 ? styles.primary : styles.secondary}
          >
            {formatAmount(convertFromVes(amountVes, currency, rates), currency)}
          </span>
        ))}
      </div>
    </div>
  )
}
