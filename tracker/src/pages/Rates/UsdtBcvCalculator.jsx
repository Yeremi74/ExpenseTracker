import { useEffect, useState } from 'react'
import { convertUsdBcvToUsdt, convertUsdtToUsdBcv } from '../../utils/currency.js'
import formStyles from '../../components/forms/Form.module.css'
import styles from './BcvCalculator.module.css'

function formatCalculated(value) {
  if (value == null || Number.isNaN(value)) return ''
  return Number(value).toFixed(2)
}

export default function UsdtBcvCalculator({ usdBcvRate, usdtRate, disabled }) {
  const [usdt, setUsdt] = useState('')
  const [usdBcv, setUsdBcv] = useState('')
  const numericUsdBcv = Number(usdBcvRate) || 0
  const numericUsdt = Number(usdtRate) || 0
  const rates = { usdBcv: numericUsdBcv, usdt: numericUsdt }
  const canConvert = numericUsdBcv > 0 && numericUsdt > 0

  useEffect(() => {
    if (!canConvert) return
    if (usdt !== '') {
      setUsdBcv(formatCalculated(convertUsdtToUsdBcv(Number(usdt), rates)))
      return
    }
    if (usdBcv !== '') {
      setUsdt(formatCalculated(convertUsdBcvToUsdt(Number(usdBcv), rates)))
    }
  }, [numericUsdBcv, numericUsdt])

  function handleUsdtChange(value) {
    setUsdt(value)
    if (value === '' || !canConvert) {
      setUsdBcv('')
      return
    }
    const num = Number(value)
    if (Number.isNaN(num)) return
    setUsdBcv(formatCalculated(convertUsdtToUsdBcv(num, rates)))
  }

  function handleUsdBcvChange(value) {
    setUsdBcv(value)
    if (value === '' || !canConvert) {
      setUsdt('')
      return
    }
    const num = Number(value)
    if (Number.isNaN(num)) return
    setUsdt(formatCalculated(convertUsdBcvToUsdt(num, rates)))
  }

  return (
    <div className={styles.calculator}>
      <div className={formStyles.row}>
        <div className={formStyles.field}>
          <label className={formStyles.label}>USDT</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={usdt}
            onChange={(e) => handleUsdtChange(e.target.value)}
            disabled={disabled || !canConvert}
            placeholder="0"
          />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label}>Dólar BCV</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={usdBcv}
            onChange={(e) => handleUsdBcvChange(e.target.value)}
            disabled={disabled || !canConvert}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  )
}
