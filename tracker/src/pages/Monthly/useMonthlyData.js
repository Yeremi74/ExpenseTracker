import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { convertToTriple, isFxRatesValidationError } from '../../utils/fxConvert.js'
import { getSetting, putSetting } from '../../api/settingsClient.js'
import { notifySuccess } from '../../utils/successNotify.js'
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
  const [saveBusy, setSaveBusy] = useState(false)
  const [pendingRemove, setPendingRemove] = useState(null)
  const [ratesSyncing, setRatesSyncing] = useState(false)

  const dataRef = useRef(data)
  dataRef.current = data
  const fxRatesPanelRef = useRef(null)

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
      setRatesSyncing(true)
      putSetting('fx_rates', rates)
        .then(() => {
          setSyncError('')
        })
        .catch((e) => {
          setSyncError(e.message || 'Error al guardar las tasas')
        })
        .finally(() => setRatesSyncing(false))
    }, 400)
    return () => clearTimeout(t)
  }, [rates, ready, persistOk])

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

  async function addItem(kind, draft, setDraft) {
    setFormError('')
    let item
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
      item =
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
    } catch (e) {
      setFormError(e.message || 'No se pudo validar el registro.')
      if (isFxRatesValidationError(e)) {
        requestAnimationFrame(() => {
          fxRatesPanelRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        })
      }
      return
    }

    const listKey = kind === 'expense' ? 'expenses' : 'debts'
    const prev = dataRef.current
    const nextData = {
      ...prev,
      [listKey]: [...prev[listKey], item],
    }

    setSaveBusy(true)
    try {
      await putSetting('monthly', nextData)
      setData(nextData)
      setSyncError('')
      notifySuccess(
        kind === 'expense'
          ? 'Se ha guardado el gasto.'
          : 'Se ha guardado el registro de deuda.'
      )
      if (kind === 'expense') setDraft(emptyDraftExpense())
      else setDraft(emptyDraftDebt())
    } catch (e) {
      window.alert(e.message || 'No se pudo guardar en el servidor.')
    } finally {
      setSaveBusy(false)
    }
  }

  async function removeItem(kind, id) {
    const key = kind === 'expense' ? 'expenses' : 'debts'
    const prev = dataRef.current
    const nextData = {
      ...prev,
      [key]: prev[key].filter((r) => r.id !== id),
    }

    setPendingRemove({ kind, id })
    try {
      await putSetting('monthly', nextData)
      setData(nextData)
      setSyncError('')
      notifySuccess('Se ha eliminado el registro.')
    } catch (e) {
      window.alert(e.message || 'No se pudo eliminar en el servidor.')
    } finally {
      setPendingRemove(null)
    }
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
    saveBusy,
    pendingRemove,
    ratesSyncing,
    filteredExpenses,
    filteredDebts,
    totalsExp,
    totalsDebt,
    totalsDebtPay,
    totalsDebtReceive,
    addItem,
    removeItem,
    fxRatesPanelRef,
  }
}
