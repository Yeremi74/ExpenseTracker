import { formatCurrency, formatPercent } from '../../utils/format.js'
import styles from './InsightCards.module.css'

function toneClass(value, invert = false) {
  if (value === 0) return ''
  const positive = invert ? value < 0 : value > 0
  return positive ? styles.positive : styles.negative
}

export default function InsightCards({ monthly, trends, summary }) {
  if (!monthly || !summary) return null

  const now = new Date()
  const dayOfMonth = now.getUTCDate()
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate()

  const savingsRate =
    monthly.monthIncome > 0
      ? ((monthly.monthIncome - monthly.monthExpenses) / monthly.monthIncome) * 100
      : 0
  const dailyAverage = dayOfMonth > 0 ? monthly.monthExpenses / dayOfMonth : 0
  const projectedExpenses = (monthly.monthExpenses / dayOfMonth) * daysInMonth

  const periods = trends?.periods ?? []
  const currentPeriod = periods[periods.length - 1]
  const previousPeriod = periods[periods.length - 2]
  const netChange =
    currentPeriod && previousPeriod ? currentPeriod.net - previousPeriod.net : 0

  const netPosition = summary.balance - summary.totalDebts + summary.totalReceivables

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <span className={styles.label}>Tasa de ahorro</span>
        <span className={`${styles.value} ${toneClass(savingsRate)}`}>
          {formatPercent(savingsRate, 1)}
        </span>
        <span className={styles.hint}>Del ingreso mensual actual</span>
      </div>
      <div className={styles.card}>
        <span className={styles.label}>Gasto diario</span>
        <span className={styles.value}>{formatCurrency(dailyAverage)}</span>
        <span className={styles.hint}>
          Proyección mes: {formatCurrency(projectedExpenses)}
        </span>
      </div>
      <div className={styles.card}>
        <span className={styles.label}>Cambio neto</span>
        <span className={`${styles.value} ${toneClass(netChange)}`}>
          {netChange >= 0 ? '+' : ''}
          {formatCurrency(netChange)}
        </span>
        <span className={styles.hint}>Vs. mes anterior</span>
      </div>
      <div className={styles.card}>
        <span className={styles.label}>Posición neta</span>
        <span className={`${styles.value} ${toneClass(netPosition)}`}>
          {formatCurrency(netPosition)}
        </span>
        <span className={styles.hint}>Saldo − deudas + por cobrar</span>
      </div>
    </div>
  )
}
