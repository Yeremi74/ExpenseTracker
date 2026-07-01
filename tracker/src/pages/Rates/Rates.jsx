import { useCallback, useEffect, useState } from 'react'
import { fetchLiveRates } from '../../api/api.js'
import formStyles from '../../components/forms/Form.module.css'
import Card from '../../components/ui/Card.jsx'
import IconButton from '../../components/ui/IconButton.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { formatDateTime } from '../../utils/format.js'
import BcvCalculator from './BcvCalculator.jsx'
import UsdtBcvCalculator from './UsdtBcvCalculator.jsx'
import styles from './Rates.module.css'

const USDT_SOURCE_LABELS = {
  binance_p2p: 'Binance',
  binance: 'Binance',
  bybit_p2p: 'Bybit',
  bybit: 'Bybit',
  okx_p2p: 'OKX',
  okx: 'OKX',
  p2p_average: 'P2P',
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
  const [warning, setWarning] = useState(null)
  const [usdtSource, setUsdtSource] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [calculatorTab, setCalculatorTab] = useState('bcv')

  const loadRates = useCallback(async () => {
    setLoading(true)
    setError(null)
    setWarning(null)
    try {
      const rates = await fetchLiveRates()
      setForm({
        usdBcv: formatRateInput(rates.usdBcv),
        usdt: formatRateInput(rates.usdt),
      })
      setFetchedAt(rates.fetchedAt ?? null)
      setWarning(rates.warning ?? null)
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

  return (
    <div className={styles.page}>
      <PageHeader
        title="Tasas"
        action={
          <IconButton
            icon="refresh"
            label="Actualizar tasas"
            onClick={loadRates}
            disabled={loading}
          />
        }
      />

      <Card className={styles.ratesCard}>
        <p className={styles.blockLabel}>Tasas</p>

        <div className={styles.ratesPanel}>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>BCV · Bs/USD</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.usdBcv}
                onChange={(e) => setForm({ ...form, usdBcv: e.target.value })}
                disabled={loading}
                placeholder={loading ? '…' : '582.69'}
              />
            </div>
            <div className={formStyles.field}>
              <label className={formStyles.label}>
                USDT · Bs/USDT
                {usdtSource ? ` · ${getUsdtSourceLabel(usdtSource)}` : ''}
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.usdt}
                onChange={(e) => setForm({ ...form, usdt: e.target.value })}
                disabled={loading}
                placeholder={loading ? '…' : '796.00'}
              />
            </div>
          </div>

          {fetchedAt && (
            <p className={styles.meta}>Cotizave · {formatDateTime(fetchedAt)}</p>
          )}
          {warning && <p className={formStyles.error}>{warning}</p>}
        </div>

        {error && <p className={formStyles.error}>{error}</p>}
      </Card>

      <Card className={styles.calculatorsCard}>
        <p className={styles.blockLabel}>Calculadoras</p>

        <div className={styles.tabs}>
          <button
            type="button"
            className={calculatorTab === 'bcv' ? styles.tabActive : styles.tab}
            onClick={() => setCalculatorTab('bcv')}
          >
            BCV ↔ Bs
          </button>
          <button
            type="button"
            className={calculatorTab === 'usdt' ? styles.tabActive : styles.tab}
            onClick={() => setCalculatorTab('usdt')}
          >
            USDT ↔ BCV
          </button>
        </div>

        <div
          className={calculatorTab === 'bcv' ? styles.tabPanel : styles.tabPanelHidden}
        >
          <BcvCalculator rate={form.usdBcv} disabled={loading} />
        </div>

        <div
          className={calculatorTab === 'usdt' ? styles.tabPanel : styles.tabPanelHidden}
        >
          <UsdtBcvCalculator
            usdBcvRate={form.usdBcv}
            usdtRate={form.usdt}
            disabled={loading}
          />
        </div>
      </Card>
    </div>
  )
}
