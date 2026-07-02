import { useEffect, useRef, useState } from 'react'
import { getDashboardSummary } from '../../api/api.js'
import Card from '../../components/ui/Card.jsx'
import Dropdown from '../../components/ui/Dropdown.jsx'
import MultiCurrencyStatCard from '../../components/ui/MultiCurrencyStatCard.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { CURRENCIES, convertFromVes } from '../../utils/currency.js'
import { formatAmount, formatCurrency } from '../../utils/format.js'
import { simulateBalanceOperations } from '../../utils/simulator.js'
import styles from './Simulator.module.css'

const CURRENCY_OPTIONS = CURRENCIES.map((currency) => ({
  value: currency.value,
  label: currency.label,
  triggerLabel:
    currency.value === 'ves' ? 'Bs.' : currency.value === 'usd_bcv' ? 'BCV' : 'USDT',
}))

const OPERATION_OPTIONS = [
  {
    value: 'add',
    label: 'Sumar',
    triggerLabel: '+',
    description: 'Agregar al balance',
    tone: 'positive',
  },
  {
    value: 'subtract',
    label: 'Restar',
    triggerLabel: '−',
    description: 'Quitar del balance',
    tone: 'negative',
  },
]

function createEmptyOperation(id) {
  return { id, type: 'add', amount: '', currency: 'ves' }
}

function BalanceValues({ amountVes, rates }) {
  return (
    <div className={styles.inlineValues}>
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

  const hasStarting = Number(startingAmount) > 0
  const startingStep = hasStarting ? result.steps[0] : null

  const stepByOperationId = {}
  let stepIndex = hasStarting ? 1 : 0
  for (const op of operations) {
    if (Number(op.amount) > 0) {
      stepByOperationId[op.id] = result.steps[stepIndex]
      stepIndex += 1
    }
  }

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
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Calculadora</h3>
          {summary && (
            <button type="button" className={styles.linkButton} onClick={useCurrentBalance}>
              Usar mi saldo
            </button>
          )}
        </div>

        <div className={styles.flow}>
          <div className={styles.flowRow} data-level={0} style={{ '--level': 0 }}>
            <div className={styles.rowContent}>
              <span className={styles.rowBadge}>Tengo</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={styles.amountInput}
                value={startingAmount}
                onChange={(e) => setStartingAmount(e.target.value)}
                placeholder="0.00"
              />
              <Dropdown
                value={startingCurrency}
                onChange={setStartingCurrency}
                options={CURRENCY_OPTIONS}
                aria-label="Moneda inicial"
              />
            </div>
            {startingStep && (
              <div className={styles.rowResult}>
                <BalanceValues amountVes={startingStep.balanceVes} rates={rates} />
              </div>
            )}
          </div>

          {operations.map((op, index) => {
            const step = stepByOperationId[op.id]
            const isComplete = Number(op.amount) > 0

            return (
              <div
                key={op.id}
                className={`${styles.flowRow} ${isComplete ? styles.flowRowComplete : ''}`}
                data-level={index + 1}
                style={{ '--level': index + 1 }}
              >
                <div className={styles.rowContent}>
                  <Dropdown
                    value={op.type}
                    onChange={(type) => updateOperation(op.id, { type })}
                    options={OPERATION_OPTIONS}
                    tone={op.type === 'add' ? 'positive' : 'negative'}
                    compact
                    aria-label="Tipo de operación"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={styles.amountInput}
                    value={op.amount}
                    onChange={(e) => updateOperation(op.id, { amount: e.target.value })}
                    placeholder="0.00"
                  />
                  <Dropdown
                    value={op.currency}
                    onChange={(currency) => updateOperation(op.id, { currency })}
                    options={CURRENCY_OPTIONS}
                    aria-label="Moneda de la operación"
                  />
                </div>
                {step && (
                  <div className={styles.rowResult}>
                    <BalanceValues amountVes={step.balanceVes} rates={rates} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {!ratesReady && (
          <p className={styles.hint}>
            Configura tus tasas de cambio para convertir entre monedas correctamente.
          </p>
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
