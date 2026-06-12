import { useEffect, useState } from 'react'
import { getDashboardMonthly, getDashboardSummary } from '../../api/api.js'
import formStyles from '../../components/forms/Form.module.css'
import Card from '../../components/ui/Card.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { formatCurrency } from '../../utils/format.js'
import { simulatePurchase, simulateSaving } from '../../utils/simulator.js'
import styles from './Simulator.module.css'

export default function SimulatorPage() {
  const [summary, setSummary] = useState(null)
  const [monthly, setMonthly] = useState(null)
  const [mode, setMode] = useState('saving')
  const [savingForm, setSavingForm] = useState({ monthlySaving: '', months: '6' })
  const [purchaseForm, setPurchaseForm] = useState({ amount: '' })

  useEffect(() => {
    Promise.all([getDashboardSummary(), getDashboardMonthly()])
      .then(([s, m]) => {
        setSummary(s)
        setMonthly(m)
      })
      .catch(() => {})
  }, [])

  const savingResult =
    summary &&
    simulateSaving({
      balance: summary.balance,
      monthlySaving: savingForm.monthlySaving,
      months: savingForm.months,
    })

  const purchaseResult =
    summary &&
    monthly &&
    simulatePurchase({
      balance: summary.balance,
      purchaseAmount: purchaseForm.amount,
      monthlyIncome: monthly.monthIncome,
      monthlyExpenses: monthly.monthExpenses,
    })

  return (
    <div>
      <PageHeader
        title="Simulador"
        subtitle="Proyecta escenarios antes de decidir"
      />

      {summary && (
        <div className={styles.context}>
          <span>Saldo actual: <strong>{formatCurrency(summary.balance)}</strong></span>
          {monthly && (
            <span>
              Este mes: {formatCurrency(monthly.monthIncome)} ingresos ·{' '}
              {formatCurrency(monthly.monthExpenses)} gastos
            </span>
          )}
        </div>
      )}

      <div className={styles.tabs}>
        <button
          type="button"
          className={mode === 'saving' ? styles.tabActive : styles.tab}
          onClick={() => setMode('saving')}
        >
          ¿Qué pasa si ahorro X?
        </button>
        <button
          type="button"
          className={mode === 'purchase' ? styles.tabActive : styles.tab}
          onClick={() => setMode('purchase')}
        >
          ¿Qué pasa si compro esto?
        </button>
      </div>

      {mode === 'saving' && (
        <Card>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Ahorro mensual</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={savingForm.monthlySaving}
                onChange={(e) =>
                  setSavingForm({ ...savingForm, monthlySaving: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Meses</label>
              <input
                type="number"
                min="1"
                max="120"
                value={savingForm.months}
                onChange={(e) =>
                  setSavingForm({ ...savingForm, months: e.target.value })
                }
              />
            </div>
          </div>
          {savingResult && Number(savingForm.monthlySaving) > 0 && (
            <div className={styles.results}>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Total ahorrado</span>
                <span className={styles.resultValue}>
                  {formatCurrency(savingResult.totalSaved)}
                </span>
              </div>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Saldo proyectado</span>
                <span className={`${styles.resultValue} ${styles.positive}`}>
                  {formatCurrency(savingResult.projectedBalance)}
                </span>
              </div>
            </div>
          )}
        </Card>
      )}

      {mode === 'purchase' && (
        <Card>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Monto de la compra</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={purchaseForm.amount}
              onChange={(e) =>
                setPurchaseForm({ ...purchaseForm, amount: e.target.value })
              }
              placeholder="0.00"
            />
          </div>
          {purchaseResult && Number(purchaseForm.amount) > 0 && (
            <div className={styles.results}>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Nuevo saldo</span>
                <span
                  className={`${styles.resultValue} ${
                    purchaseResult.canAfford ? styles.positive : styles.negative
                  }`}
                >
                  {formatCurrency(purchaseResult.newBalance)}
                </span>
              </div>
              {!purchaseResult.canAfford && (
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>Te faltaría</span>
                  <span className={`${styles.resultValue} ${styles.negative}`}>
                    {formatCurrency(purchaseResult.deficit)}
                  </span>
                </div>
              )}
              {purchaseResult.monthsToRecover != null && (
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>Meses para recuperar</span>
                  <span className={styles.resultValue}>
                    {purchaseResult.monthsToRecover}
                  </span>
                </div>
              )}
              {purchaseResult.monthsToRecover == null && purchaseResult.canAfford && (
                <p className={styles.hint}>
                  Con tu balance neto mensual actual no se puede estimar recuperación.
                </p>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
