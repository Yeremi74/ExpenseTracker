import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { convertToTriple } from '../../utils/fxConvert.js'
import { getSetting, putSetting } from '../../api/settingsClient.js'
import { settingsLoadErrorHint } from '../../constants/settingsUi.js'
import {
  LEGACY_STORAGE_MONTHLY,
  LEGACY_STORAGE_RATES,
  currentMonthStr,
  emptyDraftDebt,
  emptyDraftExpense,
  isFxRatesEmpty,
  isMonthlyEmpty,
  loadLegacyMonthly,
  loadLegacyRates,
  normalizeMonthlyPayload,
  normalizeRates,
} from './monthlyModel.js'

export function useMonthlyData() {
  const location = useLocation()
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
    setFormError('')
  }, [location.pathname])

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

  return {
    rates,
    setRates,
    data,
    monthFilter,
    setMonthFilter,
    draftExpense,
    setDraftExpense,
    draftDebt,
    setDraftDebt,
    formError,
    setFormError,
    ready,
    loadError,
    syncError,
    filteredExpenses,
    filteredDebts,
    totalsExp,
    totalsDebt,
    totalsDebtPay,
    totalsDebtReceive,
    addItem,
    removeItem,
  }
}
