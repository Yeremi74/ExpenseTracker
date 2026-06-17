import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../providers/AuthProvider.jsx'
import styles from './Layout.module.css'

const navSections = [
  {
    items: [{ to: '/', label: 'Dashboard', end: true }],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/incomes', label: 'Ingresos' },
      { to: '/expenses', label: 'Gastos' },
      { to: '/debts', label: 'Deudas' },
    ],
  },
  {
    label: 'Registro',
    items: [
      { to: '/history', label: 'Calendario' },
      { to: '/categories', label: 'Categorías' },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { to: '/simulator', label: 'Simulador' },
      { to: '/rates', label: 'Tasas' },
    ],
  },
]

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return undefined

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  function closeMenu() {
    setMenuOpen(false)
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const displayName = user?.name?.trim() || user?.email

  return (
    <div className={styles.shell}>
      <header className={styles.mobileHeader}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
        >
          <span className={styles.menuIcon} />
        </button>
        <div className={styles.brand}>
          <span className={styles.brandMark}>◆</span>
          <span className={styles.brandName}>Tracker</span>
        </div>
      </header>

      {menuOpen && (
        <div className={styles.overlay} onClick={closeMenu} aria-hidden="true" />
      )}

      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarTop}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>◆</span>
            <span className={styles.brandName}>Tracker</span>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={closeMenu}
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>
        {user ? (
          <nav className={styles.nav}>
            {navSections.map((section) => (
              <div key={section.label || 'overview'} className={styles.navSection}>
                {section.label && (
                  <span className={styles.navSectionLabel}>{section.label}</span>
                )}
                <div className={styles.navSectionLinks}>
                  {section.items.map((item) => (
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
                </div>
              </div>
            ))}
          </nav>
        ) : (
          <nav className={styles.nav}>
            <div className={styles.navSection}>
              <div className={styles.navSectionLinks}>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
                  }
                  onClick={closeMenu}
                >
                  Iniciar sesión
                </NavLink>
                <NavLink
                  to="/register"
                  className={({ isActive }) =>
                    isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
                  }
                  onClick={closeMenu}
                >
                  Registrarse
                </NavLink>
              </div>
            </div>
          </nav>
        )}
        {user && (
          <div className={styles.userSection}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{displayName}</span>
              {user.name?.trim() && (
                <span className={styles.userEmail}>{user.email}</span>
              )}
            </div>
            <button type="button" className={styles.sessionButton} onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>
      <main className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
