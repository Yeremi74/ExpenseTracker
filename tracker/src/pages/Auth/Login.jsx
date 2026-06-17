import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import { useAuth } from '../../providers/AuthProvider.jsx'
import styles from './Auth.module.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>◆</span>
          <span className={styles.brandName}>Tracker</span>
        </div>
        <h1 className={styles.title}>Iniciar sesión</h1>
        <p className={styles.subtitle}>Accede a tu información financiera</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-email">
              Correo
            </label>
            <input
              id="login-email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-password">
              Contraseña
            </label>
            <input
              id="login-password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className={styles.footer}>
          ¿No tienes cuenta?{' '}
          <Link className={styles.footerLink} to="/register">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
