const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const WEEKDAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const MONTHS_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

export function getMonthDays(year, month) {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7
  const days = []

  for (let i = 0; i < startOffset; i++) {
    days.push(null)
  }
  for (let d = 1; d <= lastDay; d++) {
    days.push(d)
  }
  return days
}

export function toDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getMonthRange(year, month) {
  const lastDay = new Date(year, month, 0).getDate()
  return {
    dateFrom: toDateKey(year, month, 1),
    dateTo: toDateKey(year, month, lastDay),
  }
}

export function groupItemsByDay(items, year, month) {
  const map = {}
  for (const item of items) {
    const date = new Date(item.date)
    if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month) continue
    const key = toDateKey(year, month, date.getUTCDate())
    if (!map[key]) map[key] = []
    map[key].push(item)
  }
  return map
}

export function groupEventsByDay(events, year, month) {
  return groupItemsByDay(events, year, month)
}

export function buildDebtCalendarEvents(debts, year, month) {
  const monthRange = getMonthRange(year, month)
  const events = []

  for (const debt of debts) {
    if (debt.installments?.length) {
      for (const inst of debt.installments) {
        if (!inst.dueDate) continue
        const dateKey = String(inst.dueDate).slice(0, 10)
        if (dateKey < monthRange.dateFrom || dateKey > monthRange.dateTo) continue

        events.push({
          id: `${debt.id}-${inst.id}`,
          source: 'debt',
          title: `${debt.name} (Cuota ${inst.number}/${debt.installments.length})`,
          amount: inst.amount - (inst.paidAmount || 0),
          totalAmount: inst.amount,
          currency: debt.currency || 'ves',
          date: inst.dueDate,
          debtId: debt.id,
          installmentId: inst.id,
          direction: debt.direction || 'payable',
          installmentNumber: inst.number,
          installmentTotal: debt.installments.length,
          isSettled: (inst.paidAmount || 0) >= inst.amount,
          type: 'debt',
        })
      }
      continue
    }

    if (!debt.dueDate) continue
    const dateKey = String(debt.dueDate).slice(0, 10)
    if (dateKey < monthRange.dateFrom || dateKey > monthRange.dateTo) continue

    events.push({
      id: debt.id,
      source: 'debt',
      title: debt.name,
      amount: debt.totalAmount - debt.paidAmount,
      totalAmount: debt.totalAmount,
      currency: debt.currency || 'ves',
      date: debt.dueDate,
      debtId: debt.id,
      direction: debt.direction || 'payable',
      installmentNumber: null,
      installmentTotal: null,
      isSettled: debt.paidAmount >= debt.totalAmount,
      type: 'debt',
    })
  }

  return events
}

export { WEEKDAYS, WEEKDAYS_SHORT, MONTHS, MONTHS_SHORT }
