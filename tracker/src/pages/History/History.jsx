import { useEffect, useMemo, useState } from 'react'
import {
  deleteTransaction,
  getCategories,
  getDebts,
  getTransactions,
} from '../../api/api.js'
import Calendar from '../../components/calendar/Calendar.jsx'
import formStyles from '../../components/forms/Form.module.css'
import listStyles from '../../components/lists/List.module.css'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import IconButton from '../../components/ui/IconButton.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import SidePanel from '../../components/ui/SidePanel.jsx'
import {
  MONTHS,
  buildDebtCalendarEvents,
  getMonthRange,
  groupEventsByDay,
  groupItemsByDay,
  toDateKey,
} from '../../utils/calendar.js'
import { formatAmount } from '../../utils/format.js'
import styles from './History.module.css'

const emptyFilters = {
  type: '',
  categoryId: '',
  debtId: '',
  dateFrom: '',
  dateTo: '',
  search: '',
}

function getDebtFilterOptions(debts) {
  return debts
    .map((debt) => ({ value: debt.id, label: debt.name }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

function buildDebtFilterIndex(debts) {
  const index = new Map()
  for (const debt of debts) {
    index.set(debt.id, debt.id)
  }
  return index
}

function matchesDebtFilter(event, debtId, debtFilterIndex) {
  if (!debtId) return true
  if (event.debtId === debtId) return true
  const groupKey = debtFilterIndex.get(event.debtId)
  return groupKey === debtId
}

function getCalendarQuery(year, month, filters) {
  const monthRange = getMonthRange(year, month)
  let dateFrom = monthRange.dateFrom
  let dateTo = monthRange.dateTo
  if (filters.dateFrom && filters.dateFrom > dateFrom) dateFrom = filters.dateFrom
  if (filters.dateTo && filters.dateTo < dateTo) dateTo = filters.dateTo
  return { ...filters, dateFrom, dateTo }
}

function getTransactionLabel(tx, categoryMap) {
  return tx.title?.trim() || categoryMap[tx.categoryId] || 'Sin título'
}

function DayPreview({ transactions, debts }) {
  const txPreview = transactions.slice(0, 2)
  const txRemaining = transactions.length - txPreview.length
  const debtPreview = debts.slice(0, 2)
  const debtRemaining = debts.length - debtPreview.length

  if (!transactions.length && !debts.length) return null

  return (
    <div className={styles.dayPreview}>
      {debts.length > 0 && (
        <div className={styles.dayPreviewGroup}>
          {debtPreview.map((debt) => {
            const settled = debt.isSettled
            return (
              <span
                key={`debt-${debt.id}`}
                className={`${styles.dayPreviewItem} ${
                  settled
                    ? styles.dayPreviewDebtSettled
                    : debt.direction === 'receivable'
                      ? styles.dayPreviewReceivable
                      : styles.dayPreviewDebt
                }`}
                title={debt.title}
              >
                {settled ? '✓ ' : ''}
                {debt.title}
              </span>
            )
          })}
          {debtRemaining > 0 && (
            <span className={styles.dayPreviewMore}>+{debtRemaining}</span>
          )}
        </div>
      )}
      {transactions.length > 0 && (
        <div className={styles.dayPreviewGroup}>
          {txPreview.map((tx) => (
            <span
              key={`tx-${tx.id}`}
              className={`${styles.dayPreviewItem} ${
                tx.type === 'income' ? styles.dayPreviewIncome : styles.dayPreviewExpense
              }`}
              title={tx.title?.trim() || 'Movimiento'}
            >
              {tx.title?.trim() || 'Movimiento'}
            </span>
          ))}
          {txRemaining > 0 && (
            <span className={styles.dayPreviewMore}>+{txRemaining}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  const now = new Date()
  const [calendarYear, setCalendarYear] = useState(now.getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1)
  const [selectedDay, setSelectedDay] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [monthTransactions, setMonthTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [debts, setDebts] = useState([])
  const [filters, setFilters] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [error, setError] = useState(null)

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    const query = getCalendarQuery(calendarYear, calendarMonth, applied)
    Promise.all([getTransactions(query), getDebts()])
      .then(([transactions, debtsList]) => {
        setMonthTransactions(transactions)
        setDebts(debtsList)
      })
      .catch((err) => setError(err.message))
  }, [calendarYear, calendarMonth, applied])

  function handleDaySelect(day) {
    setSelectedDay((prev) => (prev === day ? null : day))
  }

  function handleApply(e) {
    e.preventDefault()
    setApplied({ ...filters })
    setShowFilters(false)
  }

  function handleReset() {
    setFilters(emptyFilters)
    setApplied(emptyFilters)
    setSelectedDay(null)
    setShowFilters(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este movimiento?')) return
    try {
      await deleteTransaction(id)
      setMonthTransactions((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))
  const debtFilterOptions = getDebtFilterOptions(debts)
  const debtFilterIndex = useMemo(() => buildDebtFilterIndex(debts), [debts])
  const monthDebtEvents = useMemo(
    () => buildDebtCalendarEvents(debts, calendarYear, calendarMonth),
    [debts, calendarYear, calendarMonth]
  )
  const monthDebts = useMemo(
    () => monthDebtEvents.filter((event) => matchesDebtFilter(event, applied.debtId, debtFilterIndex)),
    [monthDebtEvents, applied.debtId, debtFilterIndex]
  )
  const transactionsByDay = groupItemsByDay(monthTransactions, calendarYear, calendarMonth)
  const debtsByDay = groupEventsByDay(monthDebts, calendarYear, calendarMonth)
  const selectedKey = selectedDay
    ? toDateKey(calendarYear, calendarMonth, selectedDay)
    : null
  const selectedDayTransactions = selectedKey
    ? transactionsByDay[selectedKey] || []
    : []
  const selectedDayDebts = selectedKey ? debtsByDay[selectedKey] || [] : []
  const hasActiveFilters = Object.values(applied).some((v) => v !== '')
  const hasSelectedItems = selectedDayTransactions.length > 0 || selectedDayDebts.length > 0

  return (
    <div>
      <PageHeader
        title="Historial"
        subtitle="Movimientos y deudas por día en el calendario"
      />

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dayPreviewIncome}`} />
          Ingreso
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dayPreviewExpense}`} />
          Gasto
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dayPreviewDebt}`} />
          Deuda
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dayPreviewReceivable}`} />
          Por cobrar
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dayPreviewDebtSettled}`} />
          Liquidada
        </span>
      </div>

      <div className={styles.toolbar}>
        <Button
          variant="ghost"
          className={`${styles.filterBtn} ${hasActiveFilters ? styles.filterBtnActive : ''}`}
          onClick={() => setShowFilters((v) => !v)}
        >
          Filtros{hasActiveFilters ? ' ·' : ''}
        </Button>
      </div>

      {showFilters && (
        <Card className={styles.filtersCard}>
          <form className={formStyles.form} onSubmit={handleApply}>
            <div className={styles.filterGrid}>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Tipo</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="income">Ingreso</option>
                  <option value="expense">Gasto</option>
                </select>
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Categoría</label>
                <select
                  value={filters.categoryId}
                  onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                >
                  <option value="">Todas</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Deuda</label>
                <select
                  value={filters.debtId}
                  onChange={(e) => setFilters({ ...filters, debtId: e.target.value })}
                >
                  <option value="">Todas</option>
                  {debtFilterOptions.map((debt) => (
                    <option key={debt.value} value={debt.value}>
                      {debt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Desde</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Hasta</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
              <div className={`${formStyles.field} ${styles.searchField}`}>
                <label className={formStyles.label}>Buscar</label>
                <input
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Descripción..."
                />
              </div>
            </div>
            <div className={formStyles.actions}>
              <button type="button" className={styles.resetBtn} onClick={handleReset}>
                Limpiar
              </button>
              <button type="submit" className={styles.applyBtn}>
                Aplicar filtros
              </button>
            </div>
          </form>
        </Card>
      )}

      {error && <p className={formStyles.error}>{error}</p>}

      <Calendar
        year={calendarYear}
        month={calendarMonth}
        onMonthChange={(y, m) => {
          setCalendarYear(y)
          setCalendarMonth(m)
          setSelectedDay(null)
        }}
        selectedDay={selectedDay}
        onDaySelect={handleDaySelect}
        renderDayContent={(key) => {
          const transactions = transactionsByDay[key]
          const debts = debtsByDay[key]
          if (!transactions?.length && !debts?.length) return null
          return <DayPreview transactions={transactions || []} debts={debts || []} />
        }}
      />

      <SidePanel
        open={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={
          selectedDay
            ? `${selectedDay} de ${MONTHS[calendarMonth - 1]} ${calendarYear}`
            : ''
        }
      >
        {!hasSelectedItems ? (
          <EmptyState message="Sin movimientos ni deudas este día" />
        ) : (
          <>
            {selectedDayDebts.length > 0 && (
              <div className={styles.panelSection}>
                <h3 className={styles.panelSectionTitle}>Deudas</h3>
                <div className={listStyles.list}>
                  {selectedDayDebts.map((debt) => (
                    <div
                      key={debt.id}
                      className={`${listStyles.item} ${styles.panelItem} ${
                        debt.isSettled ? styles.panelItemSettled : ''
                      }`}
                    >
                      <div className={listStyles.info}>
                        <span className={listStyles.name}>
                          {debt.isSettled ? '✓ ' : ''}
                          {debt.title}
                        </span>
                        <span className={listStyles.meta}>
                          {debt.direction === 'receivable' ? 'Me deben' : 'Yo debo'}
                          {debt.isSettled
                            ? debt.direction === 'receivable'
                              ? ' · Cobrada'
                              : ' · Pagada'
                            : ''}
                        </span>
                      </div>
                      <span
                        className={`${listStyles.amount} ${
                          debt.isSettled
                            ? styles.amountSettled
                            : debt.direction === 'receivable'
                              ? listStyles.amountPositive
                              : listStyles.amountWarning
                        }`}
                      >
                        {formatAmount(
                          debt.isSettled ? debt.totalAmount : debt.amount,
                          debt.currency || 'ves'
                        )}
                      </span>
                      <span
                        className={`${listStyles.badge} ${
                          debt.isSettled
                            ? styles.badgeDebtSettled
                            : debt.direction === 'receivable'
                              ? listStyles.badgeIncome
                              : styles.badgeDebt
                        }`}
                      >
                        {debt.isSettled ? 'Liquidada' : debt.installmentNumber ? 'Cuota' : 'Deuda'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDayTransactions.length > 0 && (
              <div className={styles.panelSection}>
                {selectedDayDebts.length > 0 && (
                  <h3 className={styles.panelSectionTitle}>Movimientos</h3>
                )}
                <div className={listStyles.list}>
                  {selectedDayTransactions.map((tx) => (
                    <div key={tx.id} className={`${listStyles.item} ${styles.panelItem}`}>
                      <div className={listStyles.info}>
                        <span className={listStyles.name}>
                          {getTransactionLabel(tx, categoryMap)}
                        </span>
                        <span className={listStyles.meta}>
                          {categoryMap[tx.categoryId] || 'Sin categoría'}
                          {tx.description && ` · ${tx.description}`}
                        </span>
                      </div>
                      <span
                        className={`${listStyles.amount} ${
                          tx.type === 'income'
                            ? listStyles.amountPositive
                            : listStyles.amountNegative
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatAmount(tx.amount, tx.currency || 'ves')}
                      </span>
                      <span
                        className={`${listStyles.badge} ${
                          tx.type === 'income' ? listStyles.badgeIncome : listStyles.badgeExpense
                        }`}
                      >
                        {tx.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                      <div className={listStyles.actions}>
                        <IconButton
                          icon="trash"
                          label="Eliminar"
                          variant="danger"
                          onClick={() => handleDelete(tx.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </SidePanel>
    </div>
  )
}
