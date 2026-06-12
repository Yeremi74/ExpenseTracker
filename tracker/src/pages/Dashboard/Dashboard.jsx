import { useEffect, useState } from 'react'
import {
  getDashboardAlerts,
  getDashboardExpensesByCategory,
  getDashboardMonthly,
  getDashboardRecent,
  getDashboardSummary,
  getDashboardTrends,
} from '../../api/api.js'
import ExpenseCategoryChart from '../../components/dashboard/ExpenseCategoryChart.jsx'
import InsightCards from '../../components/dashboard/InsightCards.jsx'
import MonthlySnapshot from '../../components/dashboard/MonthlySnapshot.jsx'
import MonthlyTrendChart from '../../components/dashboard/MonthlyTrendChart.jsx'
import RecentTransactions from '../../components/dashboard/RecentTransactions.jsx'
import BudgetPanel from '../../components/budget/BudgetPanel.jsx'
import AlertBanner from '../../components/ui/AlertBanner.jsx'
import MultiCurrencyStatCard from '../../components/ui/MultiCurrencyStatCard.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import styles from './Dashboard.module.css'

export default function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [monthly, setMonthly] = useState(null)
  const [trends, setTrends] = useState(null)
  const [expensesByCategory, setExpensesByCategory] = useState(null)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [alerts, setAlerts] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      getDashboardSummary(),
      getDashboardMonthly(),
      getDashboardTrends(6),
      getDashboardExpensesByCategory(),
      getDashboardRecent(6),
      getDashboardAlerts(),
    ])
      .then(([summaryData, monthlyData, trendsData, categoryData, recentData, alertsData]) => {
        setSummary(summaryData)
        setMonthly(monthlyData)
        setTrends(trendsData)
        setExpensesByCategory(categoryData)
        setRecentTransactions(recentData)
        setAlerts(alertsData)
      })
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div className={styles.page}>
      <PageHeader
        title="Dashboard"
        subtitle="Visión general de tus finanzas en bolívares, dólares BCV y USDT"
      />
      {error && <p className={styles.error}>{error}</p>}
      <AlertBanner alerts={alerts} />
      {summary && (
        <div className={styles.statsGrid}>
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
      <InsightCards monthly={monthly} trends={trends} summary={summary} />
      <div className={styles.chartsGrid}>
        <MonthlyTrendChart periods={trends?.periods ?? []} />
        <ExpenseCategoryChart
          items={expensesByCategory?.items ?? []}
          total={expensesByCategory?.total ?? 0}
        />
      </div>
      <div className={styles.bottomGrid}>
        <MonthlySnapshot monthly={monthly} summary={summary} />
        <RecentTransactions transactions={recentTransactions} />
      </div>
      <div className={styles.budgetSection}>
        <BudgetPanel />
      </div>
    </div>
  )
}
