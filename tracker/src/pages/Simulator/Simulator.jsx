import { useEffect, useRef, useState } from 'react'
import { getDashboardSummary } from '../../api/api.js'
import formStyles from '../../components/forms/Form.module.css'
import Card from '../../components/ui/Card.jsx'
import CurrencySelect from '../../components/ui/CurrencySelect.jsx'
import MultiCurrencyStatCard from '../../components/ui/MultiCurrencyStatCard.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { CURRENCIES, convertFromVes } from '../../utils/currency.js'
import { formatAmount, formatCurrency } from '../../utils/format.js'
import { simulateBalanceOperations } from '../../utils/simulator.js'
import styles from './Simulator.module.css'

function createEmptyOperation(id) {
  return { id, type: 'add', amount: '', currency: 'ves' }
}

function BalanceValues({ amountVes, rates }) {
  return (
    <div className={styles.stepValues}>
      {CURRENCIES.map(({ value: currency }, index) => (
        <span
          key={currency}
          className={index === 0 ? styles.primaryValue : styles.secondaryValue}
        >
          {formatAmount(convertFromVes(amountVes, currency, rates), currency)}
        </span>
      ))}
    </div>
  )
}

export default function SimulatorPage() {
  const nextId = useRef(2)
  const [summary, setSummary] = useState(null)
  const [startingAmount, setStartingAmount] = useState('')
  const [startingCurrency, setStartingCurrency] = useState('ves')
  const [operations, setOperations] = useState([createEmptyOperation(1)])

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch(() => {})
  }, [])

  const rates = summary?.rates ?? { usdBcv: 0, usdt: 0 }
  const ratesReady = rates.usdBcv > 0 && rates.usdt > 0

  const result = simulateBalanceOperations({
    startingAmount,
    startingCurrency,
    operations,
    rates,
  })

  function updateOperation(id, patch) {
    setOperations((prev) => {
      let next = prev.map((op) => (op.id === id ? { ...op, ...patch } : op))

      while (next.length > 1) {
        const last = next[next.length - 1]
        const secondLast = next[next.length - 2]
        if (Number(last.amount) <= 0 && Number(secondLast.amount) <= 0) {
          next = next.slice(0, -1)
        } else {
          break
        }
      }

      const last = next[next.length - 1]
      if (Number(last.amount) > 0) {
        next = [...next, createEmptyOperation(nextId.current++)]
      }

      return next
    })
  }

  function useCurrentBalance() {
    if (!summary) return
    setStartingAmount(String(summary.balance))
    setStartingCurrency('ves')
  }

  const hasInput =
    Number(startingAmount) > 0 || operations.some((op) => Number(op.amount) > 0)

  const finalTone =
    result.balanceVes > 0 ? 'positive' : result.balanceVes < 0 ? 'negative' : 'default'

  return (
    <div>
      <PageHeader
        title="Simulador"
        subtitle="Calcula tu balance con operaciones en distintas monedas"
      />

      {summary && (
        <div className={styles.context}>
          <span>
            Saldo actual: <strong>{formatCurrency(summary.balance)}</strong>
          </span>
        </div>
      )}

      <Card>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Tengo</h3>
            {summary && (
              <button type="button" className={styles.linkButton} onClick={useCurrentBalance}>
                Usar mi saldo
              </button>
            )}
          </div>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Monto</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={startingAmount}
                onChange={(e) => setStartingAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <CurrencySelect
              value={startingCurrency}
              onChange={setStartingCurrency}
            />
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Operaciones</h3>
          <div className={styles.operations}>
            {operations.map((op, index) => (
              <div key={op.id} className={styles.operationRow}>
                <span className={styles.operationIndex}>{index + 1}</span>
                <div className={formStyles.field}>
                  <label className={formStyles.label}>Tipo</label>
                  <select
                    value={op.type}
                    onChange={(e) => updateOperation(op.id, { type: e.target.value })}
                  >
                    <option value="add">Sumar (+)</option>
                    <option value="subtract">Restar (−)</option>
                  </select>
                </div>
                <div className={formStyles.field}>
                  <label className={formStyles.label}>Monto</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={op.amount}
                    onChange={(e) => updateOperation(op.id, { amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <CurrencySelect
                  value={op.currency}
                  onChange={(currency) => updateOperation(op.id, { currency })}
                />
              </div>
            ))}
          </div>
        </div>

        {!ratesReady && (
          <p className={styles.hint}>
            Configura tus tasas de cambio para convertir entre monedas correctamente.
          </p>
        )}

        {hasInput && result.steps.length > 0 && (
          <div className={styles.results}>
            <h3 className={styles.sectionTitle}>Balance parcial</h3>
            {result.steps.map((step, index) => (
              <div key={index} className={styles.step}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepLabel}>{step.label}</span>
                  {step.operation && (
                    <span className={styles.stepOperation}>
                      {step.operation.type === 'add' ? '+' : '−'}{' '}
                      {formatAmount(step.operation.amount, step.operation.currency)}
                    </span>
                  )}
                </div>
                <BalanceValues amountVes={step.balanceVes} rates={rates} />
              </div>
            ))}
          </div>
        )}

        {hasInput && (
          <div className={styles.finalResult}>
            <MultiCurrencyStatCard
              label="Balance final"
              amountVes={result.balanceVes}
              rates={rates}
              tone={finalTone}
            />
          </div>
        )}
      </Card>
    </div>
  )
}
