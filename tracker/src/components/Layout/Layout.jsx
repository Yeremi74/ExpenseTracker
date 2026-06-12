import { NavLink, Outlet } from 'react-router-dom'
import styles from './Layout.module.css'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/incomes', label: 'Ingresos' },
  { to: '/expenses', label: 'Gastos' },
  { to: '/history', label: 'Calendario' },
  { to: '/categories', label: 'Categorías' },
  { to: '/debts', label: 'Deudas' },
  { to: '/simulator', label: 'Simulador' },
  { to: '/rates', label: 'Tasas' },
]

export default function Layout() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>◆</span>
          <span className={styles.brandName}>Tracker</span>
        </div>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
