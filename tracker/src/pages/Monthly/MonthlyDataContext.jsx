import { createContext, useContext } from 'react'
import { useMonthlyData } from './useMonthlyData.js'

const MonthlyDataContext = createContext(null)

export function MonthlyDataProvider({ children }) {
  const value = useMonthlyData()
  return (
    <MonthlyDataContext.Provider value={value}>
      {children}
    </MonthlyDataContext.Provider>
  )
}

export function useMonthlyDataContext() {
  const ctx = useContext(MonthlyDataContext)
  if (!ctx) {
    throw new Error(
      'useMonthlyDataContext debe usarse dentro de MonthlyDataProvider'
    )
  }
  return ctx
}
