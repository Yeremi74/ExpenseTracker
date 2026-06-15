import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getExchangeRates } from '../../api/api.js'
import { convertToVes } from '../../utils/currency.js'
import { formatAmount, formatDateTime, formatRate } from '../../utils/format.js'
import styles from './FormExchangeRates.module.css'

export default function FormExchangeRates({ amount, currency }) {
  const [rates, setRates] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    setLoading(true)
    getExchangeRates()
      .then((data) => {
        if (active) setRates(data)
      })
      .catch(() => {
        if (active) setRates(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

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
        Sin tasas configuradas.{' '}
        <Link to="/rates" className={styles.link}>
          Configurar tasas
        </Link>
      </p>
    )
  }

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
      {rates?.updatedAt && (
        <p className={styles.meta}>Actualizado {formatDateTime(rates.updatedAt)}</p>
      )}
    </div>
  )
}
