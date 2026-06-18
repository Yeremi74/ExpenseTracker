import { useEffect, useState } from 'react'
import { convertFromVes, convertToVes } from '../../utils/currency.js'
import formStyles from '../../components/forms/Form.module.css'
import styles from './BcvCalculator.module.css'

function formatCalculated(value) {
  if (value == null || Number.isNaN(value)) return ''
  return Number(value).toFixed(2)
}

export default function BcvCalculator({ rate, disabled }) {
  const [usd, setUsd] = useState('')
  const [ves, setVes] = useState('')
  const numericRate = Number(rate) || 0
  const rates = { usdBcv: numericRate }
  const canConvert = numericRate > 0

  useEffect(() => {
    if (!canConvert) return
    if (usd !== '') {
      setVes(formatCalculated(convertToVes(Number(usd), 'usd_bcv', rates)))
      return
    }
    if (ves !== '') {
      setUsd(formatCalculated(convertFromVes(Number(ves), 'usd_bcv', rates)))
    }
  }, [numericRate])

  function handleUsdChange(value) {
    setUsd(value)
    if (value === '' || !canConvert) {
      setVes('')
      return
    }
    const num = Number(value)
    if (Number.isNaN(num)) return
    setVes(formatCalculated(convertToVes(num, 'usd_bcv', rates)))
  }

  function handleVesChange(value) {
    setVes(value)
    if (value === '' || !canConvert) {
      setUsd('')
      return
    }
    const num = Number(value)
    if (Number.isNaN(num)) return
    setUsd(formatCalculated(convertFromVes(num, 'usd_bcv', rates)))
  }

  return (
    <div className={styles.calculator}>
      <div className={formStyles.row}>
        <div className={formStyles.field}>
          <label className={formStyles.label}>Dólar BCV</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={usd}
            onChange={(e) => handleUsdChange(e.target.value)}
            disabled={disabled || !canConvert}
            placeholder="0"
          />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label}>Bolívares</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={ves}
            onChange={(e) => handleVesChange(e.target.value)}
            disabled={disabled || !canConvert}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  )
}
