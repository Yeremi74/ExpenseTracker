import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { getSetting, putSetting } from '../../api/settingsClient.js'
import { settingsLoadErrorHint } from '../../constants/settingsUi.js'
import SettingsPageLayout from '../../components/SettingsPageLayout/SettingsPageLayout.jsx'
import f from '../../styles/forms.module.css'
import s from './Budget503020.module.css'

const LEGACY_STORAGE_KEY = 'tracker-503020-budget'

const GROUP_DEF = [
  {
    key: 'needs',
    title: '50% — Necesidades',
    hint: 'Vivienda, alimentación, servicios, transporte…',
  },
  {
    key: 'wants',
    title: '30% — Deseos',
    hint: 'Ocio, suscripciones, salidas…',
  },
  {
    key: 'savings',
    title: '20% — Ahorro y deuda',
    hint: 'Ahorro, fondo de emergencia, deudas…',
  },
]

function defaultState() {
  return {
    needs: [],
    wants: [],
    savings: [],
    income: 0,
  }
}

function normalizeState(data) {
  const next = defaultState()
  if (typeof data !== 'object' || data === null) return next
  for (const g of GROUP_DEF) {
    if (Array.isArray(data[g.key])) {
      next[g.key] = data[g.key]
        .filter((row) => row && typeof row.name === 'string')
        .map((row) => ({
          id: row.id || crypto.randomUUID(),
          name: row.name,
          amount: Number(row.amount) || 0,
        }))
    }
  }
  if (typeof data.income === 'number' && Number.isFinite(data.income)) {
    next.income = Math.max(0, data.income)
  }
  return next
}

function loadLegacyFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null
    return normalizeState(JSON.parse(raw))
  } catch {
    return null
  }
}

function isBudgetEmpty(s) {
  const d = normalizeState(s)
  return (
    d.needs.length === 0 &&
    d.wants.length === 0 &&
    d.savings.length === 0 &&
    (d.income === 0 || !Number.isFinite(d.income))
  )
}

function sumGroup(rows) {
  return rows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0)
}

function formatUsdt(n) {
  const v = new Intl.NumberFormat('es', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
  return `${v} USDT`
}

function hasBudgetContent(b) {
  const inc = Number(b.income) || 0
  if (inc > 0) return true
  return GROUP_DEF.some((g) => b[g.key].length > 0)
}

function defaultSectionEdit() {
  return { needs: false, wants: false, savings: false }
}

function defaultSectionDrafts() {
  return { needs: null, wants: null, savings: null }
}

function cloneRows(rows) {
  return rows.map((r) => ({ ...r }))
}

function IconPencil({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={20}
      height={20}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

function buildConicBackground(tNeeds, tWants, tSavings) {
  const segments = [
    { amount: tNeeds, var: 'var(--chart-needs)' },
    { amount: tWants, var: 'var(--chart-wants)' },
    { amount: tSavings, var: 'var(--chart-savings)' },
  ].filter((seg) => seg.amount > 0)

  const total = tNeeds + tWants + tSavings
  if (total <= 0 || segments.length === 0) return 'transparent'

  let acc = 0
  const parts = segments.map((seg) => {
    const start = acc
    acc += (seg.amount / total) * 100
    return `${seg.var} ${start}% ${acc}%`
  })
  return `conic-gradient(from -90deg, ${parts.join(', ')})`
}

export default function Budget503020Page() {
  const [budget, setBudget] = useState(defaultState)
  const [sectionEdit, setSectionEdit] = useState(defaultSectionEdit)
  const [sectionDrafts, setSectionDrafts] = useState(defaultSectionDrafts)
  const sectionDraftsRef = useRef(sectionDrafts)
  sectionDraftsRef.current = sectionDrafts
  const [ready, setReady] = useState(false)
  const [persistOk, setPersistOk] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [syncError, setSyncError] = useState('')

  const anySectionEditing = useMemo(
    () => GROUP_DEF.some((g) => sectionEdit[g.key]),
    [sectionEdit]
  )

  useLayoutEffect(() => {
    if (ready && !hasBudgetContent(budget)) {
      setSectionEdit({ needs: true, wants: true, savings: true })
      setSectionDrafts({
        needs: cloneRows(budget.needs),
        wants: cloneRows(budget.wants),
        savings: cloneRows(budget.savings),
      })
    }
  }, [ready, budget])

  function openSectionEdit(key) {
    setSectionDrafts((prev) => ({
      ...prev,
      [key]: cloneRows(budget[key]),
    }))
    setSectionEdit((prev) => ({ ...prev, [key]: true }))
  }

  function commitSection(key) {
    const rows = sectionDraftsRef.current[key]
    if (!rows) return
    setBudget((b) => ({
      ...b,
      [key]: rows.map((r) => ({ ...r })),
    }))
    setSectionDrafts((sd) => ({ ...sd, [key]: null }))
    setSectionEdit((prev) => ({ ...prev, [key]: false }))
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let remote = await getSetting('budget')
        if (cancelled) return
        if (isBudgetEmpty(remote)) {
          const legacy = loadLegacyFromLocalStorage()
          if (legacy && !isBudgetEmpty(legacy)) {
            await putSetting('budget', legacy)
            localStorage.removeItem(LEGACY_STORAGE_KEY)
            remote = legacy
          }
        }
        setBudget(normalizeState(remote))
        setLoadError('')
        setPersistOk(true)
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            (e.message || 'No se pudo cargar desde el servidor') +
              settingsLoadErrorHint
          )
          setBudget(defaultState())
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
      putSetting('budget', budget)
        .then(() => setSyncError(''))
        .catch((e) => {
          setSyncError(e.message || 'Error al guardar')
        })
    }, 400)
    return () => clearTimeout(t)
  }, [budget, ready, persistOk])

  const tNeeds = useMemo(() => sumGroup(budget.needs), [budget.needs])
  const tWants = useMemo(() => sumGroup(budget.wants), [budget.wants])
  const tSavings = useMemo(() => sumGroup(budget.savings), [budget.savings])
  const grand = tNeeds + tWants + tSavings
  const income = Number(budget.income) || 0
  const available = income - grand
  const pieBg = buildConicBackground(tNeeds, tWants, tSavings)

  const pN = grand > 0 ? Math.round((tNeeds / grand) * 100) : 0
  const pW = grand > 0 ? Math.round((tWants / grand) * 100) : 0
  const pS = grand > 0 ? Math.round((tSavings / grand) * 100) : 0

  function setIncome(raw) {
    const n = raw === '' ? 0 : Number(raw)
    setBudget((prev) => ({
      ...prev,
      income: Number.isFinite(n) && n >= 0 ? n : 0,
    }))
  }

  function addRow(key) {
    setSectionDrafts((prev) => {
      const rows = prev[key]
      if (!rows) return prev
      return {
        ...prev,
        [key]: [
          ...rows,
          { id: crypto.randomUUID(), name: '', amount: 0 },
        ],
      }
    })
  }

  function removeRow(key, id) {
    setSectionDrafts((prev) => {
      const rows = prev[key]
      if (!rows) return prev
      return {
        ...prev,
        [key]: rows.filter((r) => r.id !== id),
      }
    })
  }

  function updateRow(key, id, field, rawValue) {
    setSectionDrafts((prev) => {
      const rows = prev[key]
      if (!rows) return prev
      return {
        ...prev,
        [key]: rows.map((r) => {
          if (r.id !== id) return r
          if (field === 'name') return { ...r, name: rawValue }
          const amount = rawValue === '' ? 0 : Number(rawValue)
          return { ...r, amount: Number.isFinite(amount) ? amount : 0 }
        }),
      }
    })
  }

  const errBanner = loadError || syncError

  const summaryAside = (incomeEditable) => (
    <aside className={s.summary} aria-labelledby="summary-heading">
      <h2 id="summary-heading" className={s.summaryTitle}>
        Resumen
      </h2>

      {incomeEditable ? (
        <div className={s.summaryIncome}>
          <label className={s.summaryIncomeLabel} htmlFor="budget-income">
            Ingresos (USDT)
          </label>
          <input
            id="budget-income"
            className={`${f.input} ${f.inputAmount} ${s.summaryIncomeInput}`}
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            placeholder="0"
            value={income ? income : ''}
            onChange={(e) => setIncome(e.target.value)}
            aria-describedby="budget-income-hint"
          />
          <p id="budget-income-hint" className={s.summaryIncomeHint}>
            Menos total de los tres grupos.
          </p>
        </div>
      ) : (
        <div className={s.summaryIncomeReadonly}>
          <p className={s.summaryIncomeLabel}>Ingresos (USDT)</p>
          <p className={s.summaryIncomeValue}>{formatUsdt(income)}</p>
          <p className={s.summaryIncomeHint}>Menos total de los tres grupos.</p>
        </div>
      )}

      <p className={s.summaryTotal} aria-live="polite">
        Total gastos (3 grupos):{' '}
        <span className={s.summaryTotalNum}>{formatUsdt(grand)}</span>
      </p>

      <p
        className={`${s.summaryAvailable}${available < 0 ? ` ${s.summaryAvailableNegative}` : ''}`}
        aria-live="polite"
      >
        Disponible:{' '}
        <span className={s.summaryAvailableNum}>{formatUsdt(available)}</span>
      </p>

      <div className={s.pieBlock}>
        <div
          className={`${s.donut}${grand <= 0 ? ` ${s.donutEmpty}` : ''}`}
          style={{ '--donut-bg': pieBg }}
          role="img"
          aria-label={`Gráfico circular: necesidades ${pN} por ciento, deseos ${pW} por ciento, ahorro ${pS} por ciento`}
        >
          <div className={s.donutHole} />
        </div>
        <ul className={s.legend} role="list">
          <li>
            <span className={`${s.swatch} ${s.swatchNeeds}`} />{' '}
            Necesidades (50) — {formatUsdt(tNeeds)}
          </li>
          <li>
            <span className={`${s.swatch} ${s.swatchWants}`} />{' '}
            Deseos (30) — {formatUsdt(tWants)}
          </li>
          <li>
            <span className={`${s.swatch} ${s.swatchSavings}`} />{' '}
            Ahorro / deuda (20) — {formatUsdt(tSavings)}
          </li>
        </ul>
      </div>
    </aside>
  )

  return (
    <SettingsPageLayout
      title="Presupuesto 50 / 30 / 20"
      ready={ready}
      errorMessage={errBanner}
    >
      {ready ? (
        <div
          className={`${s.layout}${anySectionEditing ? '' : ` ${s.layoutCompact}`}`}
        >
          <div className={s.layoutGroups}>
            {GROUP_DEF.map((g) => {
              const isEditing = sectionEdit[g.key]
              const draftRows = sectionDrafts[g.key]
              return isEditing && draftRows ? (
                <section
                  key={g.key}
                  className={s.budgetCard}
                  data-group={g.key}
                  aria-labelledby={`title-${g.key}`}
                >
                  <div className={s.sectionHeadRow}>
                    <h2 id={`title-${g.key}`} className={s.budgetCardTitle}>
                      {g.title}
                    </h2>
                    <button
                      type="button"
                      className={s.btnSectionDone}
                      onClick={() => commitSection(g.key)}
                    >
                      Listo
                    </button>
                  </div>
                  <div className={s.budgetCardHead}>
                    <p className={s.budgetCardHint}>{g.hint}</p>
                    <p className={s.budgetCardSubtotal} aria-live="polite">
                      Subtotal:{' '}
                      <strong>{formatUsdt(sumGroup(draftRows))}</strong>
                    </p>
                  </div>
                  <ul className={s.expenseList} role="list">
                    {draftRows.map((row) => (
                      <li
                        key={row.id}
                        className={s.expenseRow}
                        data-id={row.id}
                      >
                        <label className="sr-only" htmlFor={`name-${row.id}`}>
                          Concepto
                        </label>
                        <input
                          id={`name-${row.id}`}
                          className={f.input}
                          type="text"
                          placeholder="Concepto del gasto"
                          value={row.name}
                          autoComplete="off"
                          onChange={(e) =>
                            updateRow(g.key, row.id, 'name', e.target.value)
                          }
                        />
                        <label className="sr-only" htmlFor={`amt-${row.id}`}>
                          Importe en USDT
                        </label>
                        <input
                          id={`amt-${row.id}`}
                          className={`${f.input} ${f.inputAmount}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="1"
                          placeholder="0"
                          value={row.amount ? row.amount : ''}
                          onChange={(e) =>
                            updateRow(g.key, row.id, 'amount', e.target.value)
                          }
                        />
                        <button
                          type="button"
                          className={f.btnRemove}
                          aria-label="Quitar gasto"
                          onClick={() => removeRow(g.key, row.id)}
                        >
                          &times;
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={f.btnAdd}
                    onClick={() => addRow(g.key)}
                  >
                    + Añadir gasto
                  </button>
                </section>
              ) : (
                <section
                  key={g.key}
                  className={`${s.budgetCard} ${s.budgetCardCompact}`}
                  data-group={g.key}
                  aria-labelledby={`compact-${g.key}`}
                >
                  <div className={s.compactCardHead}>
                    <h2 id={`compact-${g.key}`} className={s.compactTitle}>
                      {g.title}
                    </h2>
                    <div className={s.compactCardActions}>
                      <p className={s.compactSubtotal} aria-live="polite">
                        {formatUsdt(sumGroup(budget[g.key]))}
                      </p>
                      <button
                        type="button"
                        className={s.btnSectionEdit}
                        onClick={() => openSectionEdit(g.key)}
                        aria-label={`Editar ${g.title}`}
                        title="Editar"
                      >
                        <IconPencil className={s.btnSectionEditIcon} />
                      </button>
                    </div>
                  </div>
                  {budget[g.key].length === 0 ? (
                    <p className={s.compactEmpty}>Sin partidas</p>
                  ) : (
                    <ul className={s.compactList} role="list">
                      {budget[g.key].map((row) => (
                        <li key={row.id} className={s.compactLine}>
                          <span className={s.compactName}>
                            {row.name.trim() ? row.name : '—'}
                          </span>
                          <span className={s.compactAmt}>
                            {formatUsdt(row.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
          {summaryAside(anySectionEditing)}
        </div>
      ) : null}
    </SettingsPageLayout>
  )
}
