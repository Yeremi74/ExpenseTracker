import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import styles from './AppShell.module.css'

export default function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div id="app" className={styles.root}>
      <header className={styles.navWrap}>
        <nav className={styles.nav} aria-label="Secciones">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${styles.navLink}${isActive ? ` ${styles.navLinkActive}` : ''}`
            }
          >
            Presupuesto 50/30/20
          </NavLink>
          <NavLink
            to="/mensual"
            className={({ isActive }) =>
              `${styles.navLink}${isActive ? ` ${styles.navLinkActive}` : ''}`
            }
          >
            Gastos y deudas
          </NavLink>
          {/* <NavLink
            to="/quiero-comprar"
            className={({ isActive }) =>
              `${styles.navLink}${isActive ? ` ${styles.navLinkActive}` : ''}`
            }
          >
            Quiero comprar
          </NavLink> */}
        </nav>
        <div className={styles.userBar}>
          <span className={styles.userEmail} title={user.email}>
            {user.email}
          </span>
          <button
            type="button"
            className={styles.btnLogout}
            onClick={handleLogout}
          >
            Salir
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
