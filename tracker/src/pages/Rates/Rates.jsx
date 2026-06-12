import { useCallback, useEffect, useState } from 'react'
import { fetchLiveRates, updateExchangeRates } from '../../api/api.js'
import formStyles from '../../components/forms/Form.module.css'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { formatDateTime } from '../../utils/format.js'
import styles from './Rates.module.css'

const USDT_SOURCE_LABELS = {
  binance_p2p: 'Binance P2P',
  binance: 'Binance P2P',
  bybit_p2p: 'Bybit P2P',
  bybit: 'Bybit P2P',
  okx_p2p: 'OKX P2P',
  okx: 'OKX P2P',
  p2p_average: 'Promedio P2P',
}

function getUsdtSourceLabel(source) {
  return USDT_SOURCE_LABELS[source] || source || 'P2P'
}

function formatRateInput(value) {
  if (value == null || Number.isNaN(Number(value))) return ''
  const amount = Number(value)
  if (amount <= 0) return ''
  return amount.toFixed(2)
}

export default function RatesPage() {
  const [form, setForm] = useState({ usdBcv: '', usdt: '' })
  const [fetchedAt, setFetchedAt] = useState(null)
  const [usdtSource, setUsdtSource] = useState(null)
  const [savedAt, setSavedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadRates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rates = await fetchLiveRates()
      setForm({
        usdBcv: formatRateInput(rates.usdBcv),
        usdt: formatRateInput(rates.usdt),
      })
      setFetchedAt(rates.fetchedAt ?? null)
      setUsdtSource(rates.usdtSource ?? null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRates()
  }, [loadRates])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const rates = await updateExchangeRates({
        usdBcv: Number(form.usdBcv),
        usdt: Number(form.usdt),
      })
      setSavedAt(rates.updatedAt)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Tasas de cambio"
        subtitle="Tasas de Cotizave, editables antes de guardar"
      />

      <Card>
        <form className={formStyles.form} onSubmit={handleSubmit}>
          <p className={styles.source}>Cotizave · tasas en vivo</p>

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
                disabled={loading}
                placeholder={loading ? 'Cargando…' : 'Ej. 582.69'}
              />
            </div>
            <div className={formStyles.field}>
              <label className={formStyles.label}>
                USDT (Bs. por 1 USDT)
                {usdtSource ? ` · ${getUsdtSourceLabel(usdtSource)}` : ''}
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.usdt}
                onChange={(e) => setForm({ ...form, usdt: e.target.value })}
                required
                disabled={loading}
                placeholder={loading ? 'Cargando…' : 'Ej. 796.00'}
              />
            </div>
          </div>

          <p className={styles.hint}>
            Al abrir la página se cargan las tasas de Cotizave redondeadas hacia arriba
            a 2 decimales (582.6862 → 582.69). Puedes ajustar los valores y guardarlos
            para usarlos en el dashboard y los presupuestos.
          </p>

          {fetchedAt && (
            <p className={styles.meta}>
              Cotizave: {formatDateTime(fetchedAt)}
            </p>
          )}

          {savedAt && (
            <p className={styles.meta}>
              Guardado: {formatDateTime(savedAt)}
            </p>
          )}

          {error && <p className={formStyles.error}>{error}</p>}

          <div className={formStyles.actions}>
            <Button
              type="button"
              variant="ghost"
              onClick={loadRates}
              disabled={loading || saving}
            >
              {loading ? 'Actualizando…' : 'Actualizar desde Cotizave'}
            </Button>
            <Button type="submit" disabled={loading || saving}>
              {saving ? 'Guardando…' : 'Guardar tasas'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
