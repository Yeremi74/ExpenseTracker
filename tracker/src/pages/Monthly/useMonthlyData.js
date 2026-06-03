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
  emptyDraftIncome,
  isFxRatesEmpty,
  isMonthlyEmpty,
  loadLegacyMonthly,
  loadLegacyRates,
  normalizeMonthlyPayload,
  normalizeRates,
  rowToDraft,
} from './monthlyModel.js'

export function useMonthlyData() {
  const location = useLocation()
  const [rates, setRates] = useState(() => ({ usdtBs: '', bcvUsdBs: '' }))
  const [data, setData] = useState(() => ({
    expenses: [],
    incomes: [],
    debts: [],
  }))
  const [monthFilter, setMonthFilter] = useState(currentMonthStr)
  const [draftExpense, setDraftExpense] = useState(emptyDraftExpense)
  const [draftIncome, setDraftIncome] = useState(emptyDraftIncome)
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
  const transactionFormRef = useRef(null)

  useEffect(() => {
    setFormError('')
    setDraftExpense(emptyDraftExpense())
    setDraftIncome(emptyDraftIncome())
    setDraftDebt(emptyDraftDebt())
  }, [location.pathname])

  useEffect(() => {
    setDraftExpense(emptyDraftExpense())
    setDraftIncome(emptyDraftIncome())
    setDraftDebt(emptyDraftDebt())
    setFormError('')
  }, [monthFilter])

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
            (legacyData.expenses.length > 0 ||
              legacyData.incomes.length > 0 ||
              legacyData.debts.length > 0)
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
          setData({ expenses: [], incomes: [], debts: [] })
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

  const filteredIncomes = useMemo(() => {
    return data.incomes
      .filter((r) => r.date.startsWith(monthFilter))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [data.incomes, monthFilter])

  const filteredDebts = useMemo(() => {
    return data.debts
      .filter((r) => r.date.startsWith(monthFilter))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [data.debts, monthFilter])

  function startEditItem(kind, row) {
    setFormError('')
    const draft = rowToDraft(row, kind)
    if (kind === 'expense') setDraftExpense(draft)
    else if (kind === 'income') setDraftIncome(draft)
    else setDraftDebt(draft)
    requestAnimationFrame(() => {
      transactionFormRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    })
  }

  function cancelEdit(kind) {
    setFormError('')
    if (kind === 'expense') setDraftExpense(emptyDraftExpense())
    else if (kind === 'income') setDraftIncome(emptyDraftIncome())
    else setDraftDebt(emptyDraftDebt())
  }

  async function saveItem(kind, draft, setDraft) {
    setFormError('')
    const isEdit = Boolean(draft.editId)
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
            : kind === 'income'
              ? 'Indica el concepto del ingreso.'
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
        kind === 'expense' || kind === 'income'
          ? {
              id: isEdit ? draft.editId : crypto.randomUUID(),
              concept,
              description,
              date: draft.date,
              bs: triple.bs,
              usdt: triple.usdt,
              usdBcv: triple.usdBcv,
            }
          : {
              id: isEdit ? draft.editId : crypto.randomUUID(),
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

    const listKey =
      kind === 'expense'
        ? 'expenses'
        : kind === 'income'
          ? 'incomes'
          : 'debts'
    const prev = dataRef.current
    const nextData = isEdit
      ? {
          ...prev,
          [listKey]: prev[listKey].map((r) =>
            r.id === draft.editId ? item : r
          ),
        }
      : {
          ...prev,
          [listKey]: [...prev[listKey], item],
        }

    setSaveBusy(true)
    try {
      await putSetting('monthly', nextData)
      setData(nextData)
      setSyncError('')
      notifySuccess(
        isEdit
          ? kind === 'expense'
            ? 'Se ha actualizado el gasto.'
            : kind === 'income'
              ? 'Se ha actualizado el ingreso.'
              : 'Se ha actualizado el registro de deuda.'
          : kind === 'expense'
            ? 'Se ha guardado el gasto.'
            : kind === 'income'
              ? 'Se ha guardado el ingreso.'
              : 'Se ha guardado el registro de deuda.'
      )
      if (kind === 'expense') setDraft(emptyDraftExpense())
      else if (kind === 'income') setDraft(emptyDraftIncome())
      else setDraft(emptyDraftDebt())
    } catch (e) {
      window.alert(e.message || 'No se pudo guardar en el servidor.')
    } finally {
      setSaveBusy(false)
    }
  }

  async function removeItem(kind, id) {
    const key =
      kind === 'expense'
        ? 'expenses'
        : kind === 'income'
          ? 'incomes'
          : 'debts'
    const prev = dataRef.current
    const nextData = {
      ...prev,
      [key]: prev[key].filter((r) => r.id !== id),
    }

    setPendingRemove({ kind, id })
    if (kind === 'expense') {
      setDraftExpense((d) => (d.editId === id ? emptyDraftExpense() : d))
    } else if (kind === 'income') {
      setDraftIncome((d) => (d.editId === id ? emptyDraftIncome() : d))
    } else {
      setDraftDebt((d) => (d.editId === id ? emptyDraftDebt() : d))
    }
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
  const totalsInc = sumTriple(filteredIncomes)
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
    draftIncome,
    setDraftIncome,
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
    filteredIncomes,
    filteredDebts,
    totalsExp,
    totalsInc,
    totalsDebt,
    totalsDebtPay,
    totalsDebtReceive,
    saveItem,
    startEditItem,
    cancelEdit,
    removeItem,
    fxRatesPanelRef,
    transactionFormRef,
  }
}
