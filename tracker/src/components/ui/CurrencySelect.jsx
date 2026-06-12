import { CURRENCIES } from '../../utils/currency.js'
import formStyles from '../forms/Form.module.css'

export default function CurrencySelect({ value, onChange, label = 'Moneda' }) {
  return (
    <div className={formStyles.field}>
      <label className={formStyles.label}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {CURRENCIES.map((currency) => (
          <option key={currency.value} value={currency.value}>
            {currency.label}
          </option>
        ))}
      </select>
    </div>
  )
}
