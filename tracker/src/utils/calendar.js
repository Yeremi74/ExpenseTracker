const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
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

export { WEEKDAYS, MONTHS }
