import { useState } from 'react'
import Card from '../ui/Card.jsx'
import {
  MONTHS,
  WEEKDAYS,
  getMonthDays,
  toDateKey,
} from '../../utils/calendar.js'
import styles from './Calendar.module.css'

export default function Calendar({
  year: yearProp,
  month: monthProp,
  onMonthChange,
  selectedDay,
  onDaySelect,
  hasMarker,
  renderDayContent,
  className,
}) {
  const now = new Date()
  const [internalYear, setInternalYear] = useState(now.getFullYear())
  const [internalMonth, setInternalMonth] = useState(now.getMonth() + 1)

  const year = yearProp ?? internalYear
  const month = monthProp ?? internalMonth
  const isDetailed = Boolean(renderDayContent)

  function changeMonth(nextYear, nextMonth) {
    if (yearProp === undefined) {
      setInternalYear(nextYear)
      setInternalMonth(nextMonth)
    }
    onMonthChange?.(nextYear, nextMonth)
  }

  function prevMonth() {
    if (month === 1) {
      changeMonth(year - 1, 12)
    } else {
      changeMonth(year, month - 1)
    }
    onDaySelect?.(null)
  }

  function nextMonth() {
    if (month === 12) {
      changeMonth(year + 1, 1)
    } else {
      changeMonth(year, month + 1)
    }
    onDaySelect?.(null)
  }

  const days = getMonthDays(year, month)

  return (
    <Card className={`${styles.calendarCard} ${className || ''}`}>
      <div className={styles.nav}>
        <button type="button" className={styles.navBtn} onClick={prevMonth}>
          ←
        </button>
        <h2 className={styles.monthLabel}>
          {MONTHS[month - 1]} {year}
        </h2>
        <button type="button" className={styles.navBtn} onClick={nextMonth}>
          →
        </button>
      </div>

      <div className={styles.weekdays}>
        {WEEKDAYS.map((d) => (
          <span key={d} className={styles.weekday}>{d}</span>
        ))}
      </div>

      <div className={styles.grid}>
        {days.map((day, i) => {
          if (!day) {
            return (
              <div
                key={`empty-${i}`}
                className={`${styles.emptyDay} ${isDetailed ? styles.emptyDayDetailed : ''}`}
              />
            )
          }

          const key = toDateKey(year, month, day)
          const isToday =
            day === now.getDate() &&
            month === now.getMonth() + 1 &&
            year === now.getFullYear()
          const isSelected = selectedDay === day
          const dayContent = renderDayContent?.(key, day)
          const showMarker = !isDetailed && hasMarker?.(key)

          return (
            <button
              key={key}
              type="button"
              className={`${styles.day} ${isDetailed ? styles.dayDetailed : ''} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''}`}
              onClick={() => onDaySelect?.(isSelected ? null : day)}
            >
              <span className={styles.dayNum}>{day}</span>
              {dayContent ? (
                <div className={styles.dayContent}>{dayContent}</div>
              ) : (
                showMarker && <span className={styles.dot} />
              )}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
