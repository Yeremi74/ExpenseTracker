import f from '../../styles/forms.module.css'
import { UNITS } from './monthlyModel.js'
import s from './Monthly.module.css'

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

/** Saldo: lo que te deben menos lo que tú debes (misma moneda por columna). */
function netBalance(receive, pay) {
  return {
    bs: receive.bs - pay.bs,
    usdt: receive.usdt - pay.usdt,
    usdBcv: receive.usdBcv - pay.usdBcv,
  }
}

function balanceToneClass(n) {
  if (n > 0) return s.netPositive
  if (n < 0) return s.netNegative
  return ''
}

export function TransactionTable({
  variant,
  rows,
  onRemove,
  pendingRemove,
  totals,
  totalsPay,
  totalsReceive,
}) {
  const primaryLabel =
    variant === 'debt' ? 'Persona / referencia' : 'Concepto'

  if (rows.length === 0) {
    const isDebtEmpty = variant === 'debt'
    const netEmpty =
      isDebtEmpty && totalsPay && totalsReceive
        ? netBalance(totalsReceive, totalsPay)
        : totals
    return (
      <div className={s.monthlyTableEmpty}>
        <p className={s.monthlyEmpty}>No hay registros en este mes.</p>
        <p className={s.monthlyTotalsInline} aria-live="polite">
          {isDebtEmpty && totalsPay && totalsReceive ? (
            <>
              Saldo neto (me deben − debo pagar): Bs {formatBs(netEmpty.bs)} ·
              USDT {formatUsdt(netEmpty.usdt)} · USD BCV{' '}
              {formatUsd(netEmpty.usdBcv)}
            </>
          ) : (
            <>
              Total: Bs {formatBs(totals.bs)} · USDT {formatUsdt(totals.usdt)}{' '}
              · USD BCV {formatUsd(totals.usdBcv)}
            </>
          )}
        </p>
      </div>
    )
  }
  const isDebt = variant === 'debt'
  const debtNet =
    isDebt && totalsPay && totalsReceive
      ? netBalance(totalsReceive, totalsPay)
      : null
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
                  disabled={Boolean(pendingRemove)}
                  onClick={() => onRemove(r.id)}
                >
                  {pendingRemove &&
                  pendingRemove.kind === variant &&
                  pendingRemove.id === r.id
                    ? '…'
                    : '×'}
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
          {isDebt && debtNet ? (
            <tr className={s.netBalanceRow}>
              <td colSpan={isDebt ? 4 : 3}>
                <strong>Saldo neto</strong>
                <span className={s.netBalanceHint}>
                  Me deben − debo pagar. Positivo: te sobra; negativo: te falta
                  para cubrir lo que debes.
                </span>
              </td>
              <td className={balanceToneClass(debtNet.bs)}>
                {formatBs(debtNet.bs)}
              </td>
              <td className={balanceToneClass(debtNet.usdt)}>
                {formatUsdt(debtNet.usdt)}
              </td>
              <td className={balanceToneClass(debtNet.usdBcv)}>
                {formatUsd(debtNet.usdBcv)}
              </td>
              <td />
            </tr>
          ) : (
            <tr>
              <td colSpan={isDebt ? 4 : 3}>
                <strong>Total</strong>
              </td>
              <td>{formatBs(totals.bs)}</td>
              <td>{formatUsdt(totals.usdt)}</td>
              <td>{formatUsd(totals.usdBcv)}</td>
              <td />
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  )
}

export function TransactionForm({
  variant,
  title,
  draft,
  setDraft,
  onSubmit,
  submitBusy = false,
  fxPanel = null,
}) {
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
      {fxPanel}
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
            step="1"
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
      <button type="submit" className={f.btnSubmit} disabled={submitBusy}>
        {submitBusy ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  )
}
