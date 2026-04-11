import { useState } from 'react'
import { changePassword } from '../../api/authClient.js'
import AuthFormField from '../../components/AuthFormField/AuthFormField.jsx'
import PageShell from '../../components/PageShell/PageShell.jsx'
import PageHeader from '../../components/PageHeader/PageHeader.jsx'
import { notifySuccess } from '../../utils/successNotify.js'
import { useAuth } from '../../context/AuthContext.jsx'
import authStyles from '../../styles/authPages.module.css'
import s from './Profile.module.css'

export default function Profile() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }
    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    setBusy(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      notifySuccess('Contraseña actualizada.')
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la contraseña')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell>
      <PageHeader title="Perfil" compact />
      <p className={s.meta}>
        Sesión: <strong>{user?.email ?? '—'}</strong>
      </p>

      <section className={s.passwordSection} aria-labelledby="pwd-heading">
        <h2 id="pwd-heading" className={s.passwordHeading}>
          Cambiar contraseña
        </h2>
        <form className={authStyles.form} onSubmit={handlePasswordSubmit}>
          {error ? (
            <p className={authStyles.error} role="alert">
              {error}
            </p>
          ) : null}
          <AuthFormField
            label="Contraseña actual"
            type="password"
            value={currentPassword}
            onValueChange={setCurrentPassword}
            autoComplete="current-password"
          />
          <AuthFormField
            label="Nueva contraseña (mín. 8 caracteres)"
            type="password"
            value={newPassword}
            onValueChange={setNewPassword}
            autoComplete="new-password"
            minLength={8}
          />
          <AuthFormField
            label="Repetir nueva contraseña"
            type="password"
            value={confirmPassword}
            onValueChange={setConfirmPassword}
            autoComplete="new-password"
            minLength={8}
          />
          <button type="submit" className={authStyles.submit} disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      </section>
    </PageShell>
  )
}
