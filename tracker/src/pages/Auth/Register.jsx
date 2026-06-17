import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import { useAuth } from '../../providers/AuthProvider.jsx'
import styles from './Auth.module.css'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, isAuthenticated } = useAuth()
  const [name, setName] = useState('')
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
      await register(email, password, name)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'No se pudo crear la cuenta')
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
        <h1 className={styles.title}>Crear cuenta</h1>
        <p className={styles.subtitle}>Registra tu espacio personal de finanzas</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="register-name">
              Nombre
            </label>
            <input
              id="register-name"
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="register-email">
              Correo
            </label>
            <input
              id="register-email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="register-password">
              Contraseña
            </label>
            <input
              id="register-password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creando cuenta…' : 'Registrarse'}
          </Button>
        </form>

        <p className={styles.footer}>
          ¿Ya tienes cuenta?{' '}
          <Link className={styles.footerLink} to="/login">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
