import {
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import AuthSessionLoading from './components/AuthSessionLoading/AuthSessionLoading.jsx'
import AppShell from './components/AppShell/AppShell.jsx'
import Budget503020Page from './pages/Budget503020/Budget503020.jsx'
import MonthlyDebtsPage from './pages/Monthly/MonthlyDebts.jsx'
import MonthlyExpensesPage from './pages/Monthly/MonthlyExpenses.jsx'
import MonthlyLayout from './pages/Monthly/MonthlyLayout.jsx'
import WishlistPage from './pages/Wishlist/Wishlist.jsx'
import LoginPage from './pages/Login/Login.jsx'
import RegisterPage from './pages/Register/Register.jsx'

function GuestOnly() {
  const { user, loading } = useAuth()
  if (loading) {
    return <AuthSessionLoading message="Cargando…" />
  }
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

function RequireAuth() {
  const { user, loading } = useAuth()

  if (loading) {
    return <AuthSessionLoading message="Cargando sesión…" />
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Budget503020Page />} />
          <Route element={<MonthlyLayout />}>
            <Route path="gastos" element={<MonthlyExpensesPage />} />
            <Route path="deudas" element={<MonthlyDebtsPage />} />
          </Route>
          <Route path="mensual" element={<Navigate to="/gastos" replace />} />
          <Route path="quiero-comprar" element={<WishlistPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
