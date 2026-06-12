import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout/Layout.jsx'
import CategoriesPage from './pages/Categories/Categories.jsx'
import DashboardPage from './pages/Dashboard/Dashboard.jsx'
import DebtsPage from './pages/Debts/Debts.jsx'
import ExpensesPage from './pages/Expenses/Expenses.jsx'
import HistoryPage from './pages/History/History.jsx'
import IncomesPage from './pages/Incomes/Incomes.jsx'
import RatesPage from './pages/Rates/Rates.jsx'
import SimulatorPage from './pages/Simulator/Simulator.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="incomes" element={<IncomesPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="debts" element={<DebtsPage />} />
        <Route path="simulator" element={<SimulatorPage />} />
        <Route path="rates" element={<RatesPage />} />
      </Route>
    </Routes>
  )
}
