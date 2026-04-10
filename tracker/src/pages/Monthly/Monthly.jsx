import { useEffect, useMemo, useState } from 'react'
import { convertToTriple } from '../../utils/fxConvert.js'
import { getSetting, putSetting } from '../../api/settingsClient.js'
import { settingsLoadErrorHint } from '../../constants/settingsUi.js'
import SettingsPageLayout from '../../components/SettingsPageLayout/SettingsPageLayout.jsx'
import f from '../../styles/forms.module.css'
import s from './Monthly.module.css'

const LEGACY_STORAGE_RATES = 'tracker-fx-rates-prefs'
const LEGACY_STORAGE_MONTHLY = 'tracker-monthly-items'

const UNITS = [
  { value: 'usdt', label: 'USDT' },
  { value: 'bs', label: 'Bolívares' },
  { value: 'usd_bcv', label: 'USD BCV' },
]

function normalizeRates(raw) {
  if (!raw || typeof raw !== 'object') return { usdtBs: '', bcvUsdBs: '' }
  return {
    usdtBs: raw.usdtBs != null ? String(raw.usdtBs) : '',
    bcvUsdBs: raw.bcvUsdBs != null ? String(raw.bcvUsdBs) : '',
  }
}

function loadLegacyRates() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_RATES)
    if (!raw) return null
    return normalizeRates(JSON.parse(raw))
  } catch {
    return null
  }
}

function loadLegacyMonthly() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_MONTHLY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) return null
    const expenses = Array.isArray(data.expenses) ? data.expenses : []
    const debts = Array.isArray(data.debts) ? data.debts : []
    return {
      expenses: expenses.filter(validItem).map(normalizeExpense),
      debts: debts.filter(validItem).map(normalizeDebt),
    }
  } catch {
    return null
  }
}

function isFxRatesEmpty(r) {
  const n = normalizeRates(r)
  return !String(n.usdtBs).trim() && !String(n.bcvUsdBs).trim()
}

function isMonthlyEmpty(d) {
  if (!d) return true
  const noExp = !Array.isArray(d.expenses) || d.expenses.length === 0
  const noDebt = !Array.isArray(d.debts) || d.debts.length === 0
  return noExp && noDebt
}

function validItem(row) {
  return (
    row &&
    typeof row.concept === 'string' &&
    typeof row.date === 'string' &&
    typeof row.bs === 'number' &&
    typeof row.usdt === 'number' &&
    typeof row.usdBcv === 'number'
  )
}

function baseFields(row) {
  return {
    id: row.id || crypto.randomUUID(),
    concept: row.concept,
    description:
      typeof row.description === 'string' ? row.description : '',
    date: row.date,
    bs: Number(row.bs) || 0,
    usdt: Number(row.usdt) || 0,
    usdBcv: Number(row.usdBcv) || 0,
  }
}

function normalizeExpense(row) {
  return baseFields(row)
}

function normalizeDebt(row) {
  return {
    ...baseFields(row),
    debtFlow: row.debtFlow === 'receive' ? 'receive' : 'pay',
  }
}

function normalizeMonthlyPayload(data) {
  if (typeof data !== 'object' || data === null)
    return { expenses: [], debts: [] }
  const expenses = Array.isArray(data.expenses) ? data.expenses : []
  const debts = Array.isArray(data.debts) ? data.debts : []
  return {
    expenses: expenses.filter(validItem).map(normalizeExpense),
    debts: debts.filter(validItem).map(normalizeDebt),
  }
}

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatBs(n) {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatUsd(n) {
  return new Intl.NumberFormat('es', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatUsdt(n) {
  return new Intl.NumberFormat('es', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

function emptyDraftExpense() {
  return {
    concept: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    unit: 'usdt',
  }
}

function emptyDraftDebt() {
  return {
    ...emptyDraftExpense(),
    debtFlow: 'pay',
  }
}

export default function MonthlyPage() {
  const [rates, setRates] = useState(() => ({ usdtBs: '', bcvUsdBs: '' }))
  const [data, setData] = useState(() => ({
    expenses: [],
    debts: [],
  }))
  const [monthFilter, setMonthFilter] = useState(currentMonthStr)
  const [draftExpense, setDraftExpense] = useState(emptyDraftExpense)
  const [draftDebt, setDraftDebt] = useState(emptyDraftDebt)
  const [formError, setFormError] = useState('')
  const [ready, setReady] = useState(false)
  const [persistOk, setPersistOk] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [syncError, setSyncError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [fxRemote, monthlyRemote] = await Promise.all([
          getSetting('fx_rates'),
          getSetting('monthly'),
        ])
        if (cancelled) return

        let ratesNext = normalizeRates(fxRemote)
        let dataNext = normalizeMonthlyPayload(monthlyRemote)

        if (isMonthlyEmpty(dataNext)) {
          const legacyData = loadLegacyMonthly()
          if (
            legacyData &&
            (legacyData.expenses.length > 0 || legacyData.debts.length > 0)
          ) {
            dataNext = legacyData
            await putSetting('monthly', legacyData)
            localStorage.removeItem(LEGACY_STORAGE_MONTHLY)
          }
        }

        if (isFxRatesEmpty(ratesNext)) {
          const legacyRates = loadLegacyRates()
          if (legacyRates && !isFxRatesEmpty(legacyRates)) {
            ratesNext = legacyRates
            await putSetting('fx_rates', legacyRates)
            localStorage.removeItem(LEGACY_STORAGE_RATES)
          }
        }

        setRates(ratesNext)
        setData(dataNext)
        setLoadError('')
        setPersistOk(true)
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            (e.message || 'No se pudo cargar desde el servidor') +
              settingsLoadErrorHint
          )
          setData({ expenses: [], debts: [] })
          setRates({ usdtBs: '', bcvUsdBs: '' })
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready || !persistOk) return
    const t = setTimeout(() => {
      Promise.all([
        putSetting('fx_rates', rates),
        putSetting('monthly', data),
      ])
        .then(() => setSyncError(''))
        .catch((e) => {
          setSyncError(e.message || 'Error al guardar')
        })
    }, 400)
    return () => clearTimeout(t)
  }, [rates, data, ready, persistOk])

  const filteredExpenses = useMemo(() => {
    return data.expenses
      .filter((r) => r.date.startsWith(monthFilter))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [data.expenses, monthFilter])

  const filteredDebts = useMemo(() => {
    return data.debts
      .filter((r) => r.date.startsWith(monthFilter))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [data.debts, monthFilter])

  function addItem(kind, draft, setDraft) {
    setFormError('')
    try {
      const triple = convertToTriple(
        draft.amount,
        draft.unit,
        rates.usdtBs,
        rates.bcvUsdBs
      )
      const concept = draft.concept.trim()
      if (!concept) {
        setFormError(
          kind === 'debt'
            ? draft.debtFlow === 'receive'
              ? 'Indica quién te debe o una referencia.'
              : 'Indica a quién debes o una referencia.'
            : 'Indica el concepto del gasto.'
        )
        return
      }
      if (!draft.date) {
        setFormError('Indica la fecha.')
        return
      }
      const description =
        typeof draft.description === 'string' ? draft.description.trim() : ''
      const item =
        kind === 'expense'
          ? {
              id: crypto.randomUUID(),
              concept,
              description,
              date: draft.date,
              bs: triple.bs,
              usdt: triple.usdt,
              usdBcv: triple.usdBcv,
            }
          : {
              id: crypto.randomUUID(),
              concept,
              description,
              date: draft.date,
              bs: triple.bs,
              usdt: triple.usdt,
              usdBcv: triple.usdBcv,
              debtFlow: draft.debtFlow === 'receive' ? 'receive' : 'pay',
            }
      setData((prev) => ({
        ...prev,
        [kind === 'expense' ? 'expenses' : 'debts']: [
          ...(kind === 'expense' ? prev.expenses : prev.debts),
          item,
        ],
      }))
      if (kind === 'expense') setDraft(emptyDraftExpense())
      else setDraft(emptyDraftDebt())
    } catch (e) {
      setFormError(e.message || 'No se pudo guardar el registro.')
    }
  }

  function removeItem(kind, id) {
    const key = kind === 'expense' ? 'expenses' : 'debts'
    setData((prev) => ({
      ...prev,
      [key]: prev[key].filter((r) => r.id !== id),
    }))
  }

  const sumTriple = (rows) =>
    rows.reduce(
      (acc, r) => ({
        bs: acc.bs + r.bs,
        usdt: acc.usdt + r.usdt,
        usdBcv: acc.usdBcv + r.usdBcv,
      }),
      { bs: 0, usdt: 0, usdBcv: 0 }
    )

  const totalsExp = sumTriple(filteredExpenses)
  const totalsDebt = sumTriple(filteredDebts)
  const totalsDebtPay = useMemo(
    () => sumTriple(filteredDebts.filter((r) => r.debtFlow !== 'receive')),
    [filteredDebts]
  )
  const totalsDebtReceive = useMemo(
    () => sumTriple(filteredDebts.filter((r) => r.debtFlow === 'receive')),
    [filteredDebts]
  )

  const errBanner = loadError || syncError

  return (
    <SettingsPageLayout
      title="Gastos y deudas (mensual)"
      ready={ready}
      errorMessage={errBanner}
    >
      <section className={s.fxPanel} aria-labelledby="fx-heading">
        <h2 id="fx-heading" className={s.fxPanelTitle}>
          Tasas (solo nuevos registros)
        </h2>
        <p className={s.fxPanelHint}>
          No modifican filas ya guardadas.
        </p>
        <div className={s.fxPanelGrid}>
          <label className={s.fxField}>
            <span className={s.fxFieldLabel}>Bs por 1 USDT</span>
            <input
              className={f.input}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
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
              step="any"
              placeholder="Ej. 50"
              value={rates.bcvUsdBs}
              onChange={(e) =>
                setRates((r) => ({ ...r, bcvUsdBs: e.target.value }))
              }
            />
          </label>
        </div>
      </section>

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

      {formError ? (
        <p className={s.formError} role="alert">
          {formError}
        </p>
      ) : null}

      <div className={s.monthlyTwoCols}>
        <section className={s.monthlyBlock} aria-labelledby="exp-heading">
          <h2 id="exp-heading" className={s.monthlyBlockTitle}>
            Gastos
          </h2>
          <TransactionTable
            variant="expense"
            rows={filteredExpenses}
            onRemove={(id) => removeItem('expense', id)}
            totals={totalsExp}
          />
          <TransactionForm
            variant="expense"
            title="Añadir gasto"
            draft={draftExpense}
            setDraft={setDraftExpense}
            onSubmit={() => addItem('expense', draftExpense, setDraftExpense)}
          />
        </section>

        <section className={s.monthlyBlock} aria-labelledby="debt-heading">
          <h2 id="debt-heading" className={s.monthlyBlockTitle}>
            Deudas
          </h2>
          <TransactionTable
            variant="debt"
            rows={filteredDebts}
            onRemove={(id) => removeItem('debt', id)}
            totals={totalsDebt}
            totalsPay={totalsDebtPay}
            totalsReceive={totalsDebtReceive}
          />
          <TransactionForm
            variant="debt"
            title="Añadir deuda"
            draft={draftDebt}
            setDraft={setDraftDebt}
            onSubmit={() => addItem('debt', draftDebt, setDraftDebt)}
          />
        </section>
      </div>
    </SettingsPageLayout>
  )
}

function TransactionTable({
  variant,
  rows,
  onRemove,
  totals,
  totalsPay,
  totalsReceive,
}) {
  const primaryLabel =
    variant === 'debt' ? 'Persona / referencia' : 'Concepto'

  if (rows.length === 0) {
    return (
      <div className={s.monthlyTableEmpty}>
        <p className={s.monthlyEmpty}>No hay registros en este mes.</p>
        <p className={s.monthlyTotalsInline} aria-live="polite">
          Total: Bs {formatBs(totals.bs)} · USDT {formatUsdt(totals.usdt)} · USD
          BCV {formatUsd(totals.usdBcv)}
        </p>
      </div>
    )
  }
  const isDebt = variant === 'debt'
  return (
    <div className={s.tableWrap}>
      <table className={s.monthlyTable}>
        <thead>
          <tr>
            {isDebt ? (
              <th scope="col">Tipo</th>
            ) : null}
            <th scope="col">{primaryLabel}</th>
            <th scope="col">Descripción</th>
            <th scope="col">Fecha</th>
            <th scope="col">Bs</th>
            <th scope="col">USDT</th>
            <th scope="col">USD BCV</th>
            <th scope="col"><span className="sr-only">Quitar</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {isDebt ? (
                <td>
                  <span
                    className={
                      r.debtFlow === 'receive'
                        ? `${s.debtBadge} ${s.debtBadgeIn}`
                        : `${s.debtBadge} ${s.debtBadgeOut}`
                    }
                  >
                    {r.debtFlow === 'receive' ? 'Me deben' : 'Debo'}
                  </span>
                </td>
              ) : null}
              <td>{r.concept}</td>
              <td className={s.tableDesc}>
                {r.description ? r.description : '—'}
              </td>
              <td>{r.date}</td>
              <td>{formatBs(r.bs)}</td>
              <td>{formatUsdt(r.usdt)}</td>
              <td>{formatUsd(r.usdBcv)}</td>
              <td>
                <button
                  type="button"
                  className={`${f.btnRemove} ${f.btnRemoveTable}`}
                  aria-label="Eliminar fila"
                  onClick={() => onRemove(r.id)}
                >
                  &times;
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {isDebt && totalsPay && totalsReceive ? (
            <>
              <tr className={s.subtotalRow}>
                <td colSpan={isDebt ? 4 : 3}>
                  <strong>Subtotal debo pagar</strong>
                </td>
                <td>{formatBs(totalsPay.bs)}</td>
                <td>{formatUsdt(totalsPay.usdt)}</td>
                <td>{formatUsd(totalsPay.usdBcv)}</td>
                <td />
              </tr>
              <tr className={s.subtotalRow}>
                <td colSpan={isDebt ? 4 : 3}>
                  <strong>Subtotal me deben</strong>
                </td>
                <td>{formatBs(totalsReceive.bs)}</td>
                <td>{formatUsdt(totalsReceive.usdt)}</td>
                <td>{formatUsd(totalsReceive.usdBcv)}</td>
                <td />
              </tr>
            </>
          ) : null}
          <tr>
            <td colSpan={isDebt ? 4 : 3}>
              <strong>Total</strong>
            </td>
            <td>{formatBs(totals.bs)}</td>
            <td>{formatUsdt(totals.usdt)}</td>
            <td>{formatUsd(totals.usdBcv)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function TransactionForm({ variant, title, draft, setDraft, onSubmit }) {
  const primaryLabel =
    variant === 'debt'
      ? draft.debtFlow === 'receive'
        ? 'Quién te debe / referencia'
        : 'A quién debes / referencia'
      : 'Concepto / qué compraste'

  return (
    <form
      className={s.monthlyForm}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <p className={s.monthlyFormTitle}>{title}</p>
      <div className={s.monthlyFormGrid}>
        {variant === 'debt' ? (
          <label
            className={`${s.monthlyFormField} ${s.monthlyFormFieldFull}`}
          >
            <span className={s.monthlyFormLabel}>Tipo de deuda</span>
            <select
              className={`${f.input} ${f.inputSelect}`}
              value={draft.debtFlow || 'pay'}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  debtFlow: e.target.value === 'receive' ? 'receive' : 'pay',
                }))
              }
            >
              <option value="pay">Yo debo pagar</option>
              <option value="receive">Me deben a mí</option>
            </select>
          </label>
        ) : null}
        <label className={s.monthlyFormField}>
          <span className={s.monthlyFormLabel}>{primaryLabel}</span>
          <input
            className={f.input}
            type="text"
            value={draft.concept}
            autoComplete="off"
            onChange={(e) =>
              setDraft((d) => ({ ...d, concept: e.target.value }))
            }
            required
          />
        </label>
        <label
          className={`${s.monthlyFormField} ${s.monthlyFormFieldFull}`}
        >
          <span className={s.monthlyFormLabel}>Descripción (opcional)</span>
          <input
            className={f.input}
            type="text"
            value={draft.description}
            autoComplete="off"
            placeholder="Notas u otros detalles"
            onChange={(e) =>
              setDraft((d) => ({ ...d, description: e.target.value }))
            }
          />
        </label>
        <label className={s.monthlyFormField}>
          <span className={s.monthlyFormLabel}>Fecha</span>
          <input
            className={f.input}
            type="date"
            value={draft.date}
            onChange={(e) =>
              setDraft((d) => ({ ...d, date: e.target.value }))
            }
            required
          />
        </label>
        <label className={s.monthlyFormField}>
          <span className={s.monthlyFormLabel}>Importe</span>
          <input
            className={f.input}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={draft.amount}
            onChange={(e) =>
              setDraft((d) => ({ ...d, amount: e.target.value }))
            }
            required
          />
        </label>
        <label className={s.monthlyFormField}>
          <span className={s.monthlyFormLabel}>Unidad</span>
          <select
            className={`${f.input} ${f.inputSelect}`}
            value={draft.unit}
            onChange={(e) =>
              setDraft((d) => ({ ...d, unit: e.target.value }))
            }
          >
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit" className={f.btnSubmit}>
        Guardar
      </button>
    </form>
  )
}
