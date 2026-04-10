import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import AuthPageLayout from '../../components/AuthPageLayout/AuthPageLayout.jsx'
import AuthFormField from '../../components/AuthFormField/AuthFormField.jsx'
import AuthFooter from '../../components/AuthFooter/AuthFooter.jsx'
import authStyles from '../../styles/authPages.module.css'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setBusy(true)
    try {
      await register(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'No se pudo crear la cuenta')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthPageLayout
      title="Crear cuenta"
      lead="Tus datos se guardan asociados a tu usuario y no se mezclan con otros."
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
          label="Contraseña (mín. 8 caracteres)"
          type="password"
          value={password}
          onValueChange={setPassword}
          autoComplete="new-password"
          minLength={8}
        />
        <AuthFormField
          label="Repetir contraseña"
          type="password"
          value={confirmPassword}
          onValueChange={setConfirmPassword}
          autoComplete="new-password"
          minLength={8}
        />
        <button type="submit" className={authStyles.submit} disabled={busy}>
          {busy ? 'Creando…' : 'Registrarse'}
        </button>
      </form>

      <AuthFooter>
        ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
      </AuthFooter>
    </AuthPageLayout>
  )
}
