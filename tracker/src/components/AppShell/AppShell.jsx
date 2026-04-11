import { useEffect, useId, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { SUCCESS_NOTIFY_EVENT } from '../../utils/successNotify.js'
import styles from './AppShell.module.css'

function navLinkClassName(isActive, stylesObj) {
  return `${stylesObj.navLink}${isActive ? ` ${stylesObj.navLinkActive}` : ''}`
}

export default function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileNavPanel, setMobileNavPanel] = useState('main')
  const [successToast, setSuccessToast] = useState(null)
  const mobileNavId = useId()
  const settingsMenuId = useId()
  const settingsWrapRef = useRef(null)

  useEffect(() => {
    setMenuOpen(false)
    setSettingsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) setMobileNavPanel('main')
  }, [menuOpen])

  useEffect(() => {
    if (!settingsOpen) return undefined
    function onPointerDown(e) {
      if (
        settingsWrapRef.current &&
        !settingsWrapRef.current.contains(e.target)
      ) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [settingsOpen])

  useEffect(() => {
    if (!settingsOpen) return undefined
    function onKeyDown(e) {
      if (e.key === 'Escape') setSettingsOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [settingsOpen])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)')
    function closeIfDesktop() {
      if (mq.matches) setMenuOpen(false)
    }
    mq.addEventListener('change', closeIfDesktop)
    return () => mq.removeEventListener('change', closeIfDesktop)
  }, [])

  useEffect(() => {
    let hideTimer
    function onSuccessNotify(e) {
      const msg = e.detail?.message || 'Se ha guardado correctamente.'
      clearTimeout(hideTimer)
      setSuccessToast(msg)
      hideTimer = setTimeout(() => setSuccessToast(null), 2800)
    }
    window.addEventListener(SUCCESS_NOTIFY_EVENT, onSuccessNotify)
    return () => {
      clearTimeout(hideTimer)
      window.removeEventListener(SUCCESS_NOTIFY_EVENT, onSuccessNotify)
    }
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
              to="/expenses"
              className={({ isActive }) => navLinkClassName(isActive, styles)}
            >
              Gastos
            </NavLink>
            <NavLink
              to="/debts"
              className={({ isActive }) => navLinkClassName(isActive, styles)}
            >
              Deudas
            </NavLink>
          </nav>

          <div className={styles.userBar}>
            <span className={styles.userEmail} title={user.email}>
              {user.email}
            </span>
            <div className={styles.settingsWrap} ref={settingsWrapRef}>
              <button
                type="button"
                className={styles.btnSettings}
                aria-expanded={settingsOpen}
                aria-haspopup="menu"
                aria-controls={settingsMenuId}
                onClick={() => setSettingsOpen((o) => !o)}
              >
                Ajustes
              </button>
              {settingsOpen ? (
                <div
                  id={settingsMenuId}
                  className={styles.settingsPopover}
                  role="menu"
                  aria-label="Cuenta y sesión"
                >
                  <NavLink
                    to="/profile"
                    role="menuitem"
                    className={styles.settingsPopoverItem}
                    onClick={() => setSettingsOpen(false)}
                  >
                    Perfil
                  </NavLink>
                  <button
                    type="button"
                    role="menuitem"
                    className={`${styles.settingsPopoverItem} ${styles.settingsPopoverDanger}`}
                    onClick={() => {
                      setSettingsOpen(false)
                      handleLogout()
                    }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : null}
            </div>
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
        <div className={styles.navMobileLinks}>
          {mobileNavPanel === 'main' ? (
            <>
              <NavLink
                to="/"
                end
                className={({ isActive }) => navLinkClassName(isActive, styles)}
                onClick={() => setMenuOpen(false)}
              >
                Presupuesto 50/30/20
              </NavLink>
              <NavLink
                to="/expenses"
                className={({ isActive }) => navLinkClassName(isActive, styles)}
                onClick={() => setMenuOpen(false)}
              >
                Gastos
              </NavLink>
              <NavLink
                to="/debts"
                className={({ isActive }) => navLinkClassName(isActive, styles)}
                onClick={() => setMenuOpen(false)}
              >
                Deudas
              </NavLink>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.navMobileBack}
                onClick={() => setMobileNavPanel('main')}
              >
                ← Volver
              </button>
              <NavLink
                to="/profile"
                className={({ isActive }) => navLinkClassName(isActive, styles)}
                onClick={() => setMenuOpen(false)}
              >
                Perfil
              </NavLink>
              <button
                type="button"
                className={styles.btnLogoutMobile}
                onClick={handleLogout}
              >
                Cerrar sesión
              </button>
            </>
          )}
        </div>
        <div className={styles.navMobileFooter}>
          <span className={styles.navMobileUserEmail} title={user.email}>
            {user.email}
          </span>
          {mobileNavPanel === 'main' ? (
            <button
              type="button"
              className={styles.btnMobileSettings}
              onClick={() => setMobileNavPanel('settings')}
            >
              Ajustes
            </button>
          ) : null}
        </div>
      </nav>

      <Outlet />

      {successToast ? (
        <div
          className={styles.successToast}
          role="status"
          aria-live="polite"
        >
          {successToast}
        </div>
      ) : null}
    </div>
  )
}
