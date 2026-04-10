import f from '../../styles/forms.module.css'
import s from './Monthly.module.css'

export function FxRatesPanel({ rates, setRates }) {
  return (
    <section className={s.fxPanel} aria-labelledby="fx-heading">
      <h2 id="fx-heading" className={s.fxPanelTitle}>
        Tasas (solo nuevos registros)
      </h2>
      <p className={s.fxPanelHint}>No modifican filas ya guardadas.</p>
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
}

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
