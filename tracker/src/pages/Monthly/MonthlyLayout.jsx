import { Outlet } from 'react-router-dom'
import { MonthlyDataProvider } from './MonthlyDataContext.jsx'

export default function MonthlyLayout() {
  return (
    <MonthlyDataProvider>
      <Outlet />
    </MonthlyDataProvider>
  )
}
