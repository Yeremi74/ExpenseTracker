import { useEffect, useState } from 'react'
import { getExchangeRates, updateExchangeRates } from '../../api/api.js'
import formStyles from '../../components/forms/Form.module.css'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { formatDateTime } from '../../utils/format.js'
import styles from './Rates.module.css'

export default function RatesPage() {
  const [form, setForm] = useState({ usdBcv: '', usdt: '' })
  const [updatedAt, setUpdatedAt] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getExchangeRates()
      .then((rates) => {
        setForm({
          usdBcv: rates.usdBcv > 0 ? String(rates.usdBcv) : '',
          usdt: rates.usdt > 0 ? String(rates.usdt) : '',
        })
        setUpdatedAt(rates.updatedAt)
      })
      .catch((err) => setError(err.message))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const rates = await updateExchangeRates({
        usdBcv: Number(form.usdBcv),
        usdt: Number(form.usdt),
      })
      setUpdatedAt(rates.updatedAt)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Tasas de cambio"
        subtitle="Precios en bolívares por cada unidad de moneda"
      />

      <Card>
        <form className={formStyles.form} onSubmit={handleSubmit}>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Dólar BCV (Bs. por 1 USD)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.usdBcv}
                onChange={(e) => setForm({ ...form, usdBcv: e.target.value })}
                required
                placeholder="Ej. 36.50"
              />
            </div>
            <div className={formStyles.field}>
              <label className={formStyles.label}>USDT (Bs. por 1 USDT)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.usdt}
                onChange={(e) => setForm({ ...form, usdt: e.target.value })}
                required
                placeholder="Ej. 38.20"
              />
            </div>
          </div>

          <p className={styles.hint}>
            Los montos en dólares BCV y USDT se convierten a bolívares usando estas tasas.
            El dashboard y los presupuestos muestran totales en Bs.
          </p>

          {updatedAt && (
            <p className={styles.updated}>
              Última actualización: {formatDateTime(updatedAt)}
            </p>
          )}

          {error && <p className={formStyles.error}>{error}</p>}

          <div className={formStyles.actions}>
            <Button type="submit" disabled={loading}>
              Guardar tasas
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
