import { forwardRef } from 'react'
import f from '../../styles/forms.module.css'
import s from './Monthly.module.css'

export const FxRatesPanel = forwardRef(function FxRatesPanel(
  { rates, setRates, ratesSyncing = false, embedded = false, className = '' },
  ref
) {
  const Heading = embedded ? 'h3' : 'h2'
  return (
    <section
      ref={ref}
      className={`${s.fxPanel}${embedded ? ` ${s.fxPanelInForm}` : ''}${className ? ` ${className}` : ''}`}
      aria-labelledby="fx-heading"
    >
      <Heading id="fx-heading" className={s.fxPanelTitle}>
        Tasas 
      </Heading>
      <p className={s.fxPanelHint}>
        {ratesSyncing ? (
          <span className={s.fxPanelSyncing} role="status">
            {' '}
            Guardando tasas…
          </span>
        ) : null}
      </p>
      <div className={s.fxPanelGrid}>
        <label className={s.fxField}>
          <span className={s.fxFieldLabel}>Bs por 1 USDT</span>
          <input
            className={f.input}
            type="number"
              inputMode="decimal"
              min={0}
              step="1"
              placeholder="Ej. 120"
            value={rates.usdtBs}
            onChange={(e) =>
              setRates((r) => ({ ...r, usdtBs: e.target.value }))
            }
          />
        </label>
        <label className={s.fxField}>
          <span className={s.fxFieldLabel}>Bs por 1 USD (BCV)</span>
          <input
            className={f.input}
            type="number"
              inputMode="decimal"
              min={0}
              step="1"
              placeholder="Ej. 50"
            value={rates.bcvUsdBs}
            onChange={(e) =>
              setRates((r) => ({ ...r, bcvUsdBs: e.target.value }))
            }
          />
        </label>
      </div>
    </section>
  )
})

export function MonthFilterRow({ monthFilter, setMonthFilter }) {
  return (
    <div className={s.monthFilter}>
      <label className={s.monthFilterLabel} htmlFor="month-filter">
        Mes
      </label>
      <input
        id="month-filter"
        className={`${f.input} ${s.monthFilterInput}`}
        type="month"
        value={monthFilter}
        onChange={(e) => setMonthFilter(e.target.value)}
      />
    </div>
  )
}
