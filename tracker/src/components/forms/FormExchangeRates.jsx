import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getExchangeRatesForDate } from '../../api/api.js'
import { convertToVes } from '../../utils/currency.js'
import { formatAmount, formatDate, formatRate, todayInputDate } from '../../utils/format.js'
import styles from './FormExchangeRates.module.css'

export default function FormExchangeRates({ amount, currency, date, onRatesChange }) {
  const [rates, setRates] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const rateDate = date || todayInputDate()

  useEffect(() => {
    let active = true

    setLoading(true)
    setError(null)
    onRatesChange?.(null)

    getExchangeRatesForDate(rateDate)
      .then((data) => {
        if (!active) return
        setRates(data)
        onRatesChange?.(data)
      })
      .catch((err) => {
        if (!active) return
        setRates(null)
        onRatesChange?.(null)
        setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [rateDate, onRatesChange])

  const usdBcv = formatRate(rates?.usdBcv)
  const usdt = formatRate(rates?.usdt)
  const hasRates = Boolean(usdBcv && usdt)
  const numericAmount = Number(amount)
  const showConversion =
    hasRates &&
    numericAmount > 0 &&
    (currency === 'usd_bcv' || currency === 'usdt')
  const vesEquivalent = showConversion ? convertToVes(numericAmount, currency, rates) : null

  if (loading) {
    return <p className={`${styles.panel} ${styles.loading}`}>Cargando tasas…</p>
  }

  if (!hasRates) {
    return (
      <p className={`${styles.panel} ${styles.empty}`}>
        {error || 'Sin tasas para esta fecha.'}{' '}
        <Link to="/rates" className={styles.link}>
          Configurar tasas
        </Link>
      </p>
    )
  }

  const isStoredRate = rates?.source === 'daily_snapshot' || rates?.source === 'saved'
  const metaLabel = isStoredRate
    ? `Tasas del ${formatDate(rateDate)}`
    : `Tasas de hoy · ${formatDate(rateDate)}`

  return (
    <div className={styles.panel}>
      <div className={styles.rates}>
        <span className={styles.rate}>
          <span className={styles.rateLabel}>Dólar BCV</span>
          <span className={styles.rateValue}>{usdBcv} Bs.</span>
        </span>
        <span className={styles.rate}>
          <span className={styles.rateLabel}>USDT</span>
          <span className={styles.rateValue}>{usdt} Bs.</span>
        </span>
      </div>
      {showConversion && (
        <p className={styles.conversion}>≈ {formatAmount(vesEquivalent, 'ves')}</p>
      )}
      <p className={styles.meta}>{metaLabel}</p>
      {rates?.warning && <p className={styles.meta}>{rates.warning}</p>}
    </div>
  )
}
