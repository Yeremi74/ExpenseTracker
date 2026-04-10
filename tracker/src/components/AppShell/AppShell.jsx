import { useEffect, useId, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import styles from './AppShell.module.css'

function navLinkClassName(isActive, stylesObj) {
  return `${stylesObj.navLink}${isActive ? ` ${stylesObj.navLinkActive}` : ''}`
}

export default function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const mobileNavId = useId()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)')
    function closeIfDesktop() {
      if (mq.matches) setMenuOpen(false)
    }
    mq.addEventListener('change', closeIfDesktop)
    return () => mq.removeEventListener('change', closeIfDesktop)
  }, [])

  useEffect(() => {
    if (!menuOpen) return undefined
    function onKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  function handleLogout() {
    setMenuOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div id="app" className={styles.root}>
      <header className={styles.navWrap}>
        <div className={styles.navBarRow}>
          <button
            type="button"
            className={styles.menuToggle}
            aria-expanded={menuOpen}
            aria-controls={mobileNavId}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú de navegación'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span
              className={`${styles.menuIcon}${menuOpen ? ` ${styles.menuIconOpen}` : ''}`}
              aria-hidden
            >
              <span className={styles.menuIconBar} />
              <span className={styles.menuIconBar} />
              <span className={styles.menuIconBar} />
            </span>
          </button>

          <nav className={styles.navDesktop} aria-label="Secciones">
            <NavLink
              to="/"
              end
              className={({ isActive }) => navLinkClassName(isActive, styles)}
            >
              Presupuesto 50/30/20
            </NavLink>
            <NavLink
              to="/gastos"
              className={({ isActive }) => navLinkClassName(isActive, styles)}
            >
              Gastos
            </NavLink>
            <NavLink
              to="/deudas"
              className={({ isActive }) => navLinkClassName(isActive, styles)}
            >
              Deudas
            </NavLink>
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
        </div>
      </header>

      {menuOpen ? (
        <div
          className={styles.menuBackdrop}
          aria-hidden
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <nav
        id={mobileNavId}
        className={`${styles.navMobile}${menuOpen ? ` ${styles.navMobileOpen}` : ''}`}
        aria-label="Secciones"
        aria-hidden={!menuOpen}
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) => navLinkClassName(isActive, styles)}
          onClick={() => setMenuOpen(false)}
        >
          Presupuesto 50/30/20
        </NavLink>
        <NavLink
          to="/gastos"
          className={({ isActive }) => navLinkClassName(isActive, styles)}
          onClick={() => setMenuOpen(false)}
        >
          Gastos
        </NavLink>
        <NavLink
          to="/deudas"
          className={({ isActive }) => navLinkClassName(isActive, styles)}
          onClick={() => setMenuOpen(false)}
        >
          Deudas
        </NavLink>
      </nav>

      <Outlet />
    </div>
  )
}
