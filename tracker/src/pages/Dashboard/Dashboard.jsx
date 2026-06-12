import { useEffect, useState } from 'react'
import {
  getDashboardAlerts,
  getDashboardMonthly,
  getDashboardSummary,
} from '../../api/api.js'
import BudgetPanel from '../../components/budget/BudgetPanel.jsx'
import { formatCurrency } from '../../utils/format.js'
import AlertBanner from '../../components/ui/AlertBanner.jsx'
import MultiCurrencyStatCard from '../../components/ui/MultiCurrencyStatCard.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import styles from './Dashboard.module.css'

export default function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [monthly, setMonthly] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      getDashboardSummary(),
      getDashboardMonthly(),
      getDashboardAlerts(),
    ])
      .then(([s, m, a]) => {
        setSummary(s)
        setMonthly(m)
        setAlerts(a)
      })
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen financiero en bolívares, dólares BCV y USDT" />
      {error && <p className={styles.error}>{error}</p>}
      <AlertBanner alerts={alerts} />
      {summary && (
        <div className={styles.grid}>
          <MultiCurrencyStatCard
            label="Saldo actual"
            amountVes={summary.balance}
            rates={summary.rates}
            tone={summary.balance >= 0 ? 'positive' : 'negative'}
          />
          <MultiCurrencyStatCard
            label="Ingresos"
            amountVes={summary.totalIncome}
            rates={summary.rates}
            tone="positive"
          />
          <MultiCurrencyStatCard
            label="Gastos"
            amountVes={summary.totalExpenses}
            rates={summary.rates}
            tone="negative"
          />
          <MultiCurrencyStatCard
            label="Deudas pendientes"
            amountVes={summary.totalDebts}
            rates={summary.rates}
            tone="warning"
          />
          <MultiCurrencyStatCard
            label="Por cobrar"
            amountVes={summary.totalReceivables}
            rates={summary.rates}
            tone="positive"
          />
        </div>
      )}
      {monthly && (
        <div className={styles.monthly}>
          <span className={styles.monthlyLabel}>Este mes</span>
          <span className={styles.monthlyIncome}>+{formatCurrency(monthly.monthIncome)}</span>
          <span className={styles.monthlyExpenses}>-{formatCurrency(monthly.monthExpenses)}</span>
          <span className={styles.monthlyNet}>
            Neto: {formatCurrency(monthly.monthBalance)}
          </span>
        </div>
      )}
      {summary && (
        <div className={styles.meta}>
          <span>{summary.transactionCount} movimientos</span>
          <span>{summary.debtCount} deudas registradas</span>
        </div>
      )}
      <div className={styles.budgetSection}>
        <BudgetPanel />
      </div>
    </div>
  )
}
