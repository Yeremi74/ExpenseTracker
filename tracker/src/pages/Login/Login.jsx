import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import AuthPageLayout from '../../components/AuthPageLayout/AuthPageLayout.jsx'
import AuthFormField from '../../components/AuthFormField/AuthFormField.jsx'
import AuthFooter from '../../components/AuthFooter/AuthFooter.jsx'
import authStyles from '../../styles/authPages.module.css'
import { passwordResetOtpEnabled } from '../../config/features.js'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthPageLayout
      title="Iniciar sesión"
      lead="Accede para ver tu presupuesto y listas guardadas en tu cuenta."
    >
      <form className={authStyles.form} onSubmit={handleSubmit}>
        {error ? (
          <p className={authStyles.error} role="alert">
            {error}
          </p>
        ) : null}
        <AuthFormField
          label="Email"
          type="email"
          value={email}
          onValueChange={setEmail}
          autoComplete="email"
        />
        <AuthFormField
          label="Contraseña"
          type="password"
          value={password}
          onValueChange={setPassword}
          autoComplete="current-password"
        />
        <button type="submit" className={authStyles.submit} disabled={busy}>
          {busy ? 'Accediendo…' : 'Acceder'}
        </button>
        {passwordResetOtpEnabled ? (
          <p className={authStyles.forgotLink}>
            <Link to="/password-reset">¿Olvidaste tu contraseña?</Link>
          </p>
        ) : null}
      </form>

      <AuthFooter>
        ¿No tienes cuenta? <Link to="/register">Crear cuenta</Link>
      </AuthFooter>
    </AuthPageLayout>
  )
}
