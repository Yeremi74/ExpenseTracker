import Card from '../ui/Card.jsx'
import { formatCurrency, formatPercent } from '../../utils/format.js'
import styles from './MonthlySnapshot.module.css'

export default function MonthlySnapshot({ monthly, summary }) {
  if (!monthly) return null

  const totalFlow = monthly.monthIncome + monthly.monthExpenses
  const incomeShare = totalFlow > 0 ? (monthly.monthIncome / totalFlow) * 100 : 50
  const expenseShare = totalFlow > 0 ? (monthly.monthExpenses / totalFlow) * 100 : 50
  const savingsRate =
    monthly.monthIncome > 0
      ? ((monthly.monthIncome - monthly.monthExpenses) / monthly.monthIncome) * 100
      : 0

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Resumen del mes</h2>
        <span
          className={`${styles.net} ${
            monthly.monthBalance >= 0 ? styles.netPositive : styles.netNegative
          }`}
        >
          Neto {monthly.monthBalance >= 0 ? '+' : ''}
          {formatCurrency(monthly.monthBalance)}
        </span>
      </div>
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Ingresos</span>
          <span className={`${styles.metricValue} ${styles.income}`}>
            +{formatCurrency(monthly.monthIncome)}
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Gastos</span>
          <span className={`${styles.metricValue} ${styles.expense}`}>
            -{formatCurrency(monthly.monthExpenses)}
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Ahorro</span>
          <span className={styles.metricValue}>{formatPercent(savingsRate, 1)}</span>
        </div>
      </div>
      <div>
        <div className={styles.barTrack}>
          <div className={styles.barIncome} style={{ width: `${incomeShare}%` }} />
          <div className={styles.barExpense} style={{ width: `${expenseShare}%` }} />
        </div>
        <div className={styles.barLegend}>
          <span>Ingresos {formatPercent(incomeShare, 0)}</span>
          <span>Gastos {formatPercent(expenseShare, 0)}</span>
        </div>
      </div>
      {summary && (
        <div className={styles.barLegend}>
          <span>{summary.transactionCount} movimientos totales</span>
          <span>{summary.debtCount} deudas registradas</span>
        </div>
      )}
    </Card>
  )
}
