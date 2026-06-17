import { Route, Routes } from 'react-router-dom'
import AuthFallback from './components/AuthFallback.jsx'
import GuestRoute from './components/GuestRoute.jsx'
import Layout from './components/Layout/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import LoginPage from './pages/Auth/Login.jsx'
import RegisterPage from './pages/Auth/Register.jsx'
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
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route element={<Layout />}>
          <Route element={<ProtectedRoute />}>
            <Route index element={<DashboardPage />} />
            <Route path="incomes" element={<IncomesPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="debts" element={<DebtsPage />} />
            <Route path="simulator" element={<SimulatorPage />} />
            <Route path="rates" element={<RatesPage />} />
          </Route>
          <Route path="*" element={<AuthFallback />} />
        </Route>
      </Routes>
    </>
  )
}
