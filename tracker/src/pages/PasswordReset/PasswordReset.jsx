import { useCallback, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  confirmPasswordReset,
  requestPasswordReset,
  verifyPasswordResetCode,
} from '../../api/authClient.js'
import AuthPageLayout from '../../components/AuthPageLayout/AuthPageLayout.jsx'
import AuthFormField from '../../components/AuthFormField/AuthFormField.jsx'
import AuthFooter from '../../components/AuthFooter/AuthFooter.jsx'
import authStyles from '../../styles/authPages.module.css'

const OTP_LEN = 6
const emptyDigits = () => Array(OTP_LEN).fill('')

function OtpRow({ digits, onDigitsChange, disabled }) {
  const refs = useRef([])

  const focusAt = (i) => {
    const el = refs.current[i]
    if (el) el.focus()
  }

  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/\D/g, '')
    const d = raw.slice(-1) || ''
    const next = [...digits]
    next[index] = d
    onDigitsChange(next)
    if (d && index < OTP_LEN - 1) focusAt(index + 1)
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault()
      focusAt(index - 1)
    }
    if (e.key === 'ArrowLeft' && index > 0) focusAt(index - 1)
    if (e.key === 'ArrowRight' && index < OTP_LEN - 1) focusAt(index + 1)
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, OTP_LEN)
    const next = emptyDigits()
    for (let i = 0; i < text.length; i += 1) next[i] = text[i]
    onDigitsChange(next)
    const last = Math.min(text.length, OTP_LEN) - 1
    if (last >= 0) focusAt(Math.max(0, last))
  }

  return (
    <div className={authStyles.field}>
      <span className={authStyles.label} id="otp-label">
        Código de 6 dígitos
      </span>
      <div
        className={authStyles.otpRow}
        role="group"
        aria-labelledby="otp-label"
        onPaste={handlePaste}
      >
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            className={authStyles.otpCell}
            value={digit}
            disabled={disabled}
            aria-label={`Dígito ${i + 1} de ${OTP_LEN}`}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
          />
        ))}
      </div>
    </div>
  )
}

export default function PasswordResetPage() {
  const { refreshAuth } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [digits, setDigits] = useState(emptyDigits)
  const [verifiedCode, setVerifiedCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const verifyingRef = useRef(false)

  const tryVerifyOtp = useCallback(async (codeStr, emailTrimmed) => {
    if (codeStr.length !== OTP_LEN) return
    if (!emailTrimmed) {
      setError('Falta el email')
      return
    }
    if (verifyingRef.current) return
    verifyingRef.current = true
    setError('')
    setBusy(true)
    try {
      await verifyPasswordResetCode(emailTrimmed, codeStr)
      setVerifiedCode(codeStr)
      setInfo('')
      setStep('password')
    } catch (err) {
      setError(err.message || 'Código no válido')
    } finally {
      verifyingRef.current = false
      setBusy(false)
    }
  }, [])

  const handleDigitsChange = useCallback(
    (next) => {
      setDigits(next)
      const codeStr = next.join('')
      if (codeStr.length !== OTP_LEN || !next.every((x) => x.length === 1)) {
        return
      }
      void tryVerifyOtp(codeStr, email.trim())
    },
    [email, tryVerifyOtp]
  )

  async function handleRequest(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      const { message } = await requestPasswordReset(email.trim())
      setInfo(message || 'Te hemos enviado un código a tu correo.')
      setDigits(emptyDigits())
      setStep('otp')
    } catch (err) {
      setError(err.message || 'No se pudo enviar el código')
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirm(e) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setBusy(true)
    try {
      await confirmPasswordReset(email.trim(), verifiedCode, newPassword)
      await refreshAuth()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la contraseña')
    } finally {
      setBusy(false)
    }
  }

  const codeComplete =
    digits.join('').length === OTP_LEN && digits.every((x) => x.length === 1)

  const lead =
    step === 'email'
      ? 'Indica tu email y te enviaremos un código de 6 dígitos.'
      : step === 'otp'
        ? 'Introduce el código que recibiste en tu correo.'
        : 'Elige tu nueva contraseña.'

  return (
    <AuthPageLayout title="Restablecer contraseña" lead={lead}>
      {step === 'email' ? (
        <form className={authStyles.form} onSubmit={handleRequest}>
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
          <button type="submit" className={authStyles.submit} disabled={busy}>
            {busy ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
      ) : null}

      {step === 'otp' ? (
        <div className={authStyles.form}>
          {info ? (
            <p className={authStyles.success} role="status">
              {info}
            </p>
          ) : null}
          {error ? (
            <p className={authStyles.error} role="alert">
              {error}
            </p>
          ) : null}
          <p className={authStyles.leadMuted}>
            Email: <strong>{email.trim()}</strong>
          </p>
          <OtpRow
            digits={digits}
            onDigitsChange={handleDigitsChange}
            disabled={busy}
          />
          {codeComplete ? (
            <button
              type="button"
              className={authStyles.secondary}
              disabled={busy}
              onClick={() => void tryVerifyOtp(digits.join(''), email.trim())}
            >
              Verificar código
            </button>
          ) : null}
          <button
            type="button"
            className={authStyles.secondary}
            disabled={busy}
            onClick={() => {
              setStep('email')
              setDigits(emptyDigits())
              setError('')
              setInfo('')
            }}
          >
            Cambiar email
          </button>
        </div>
      ) : null}

      {step === 'password' ? (
        <form className={authStyles.form} onSubmit={handleConfirm}>
          {error ? (
            <p className={authStyles.error} role="alert">
              {error}
            </p>
          ) : null}
          <AuthFormField
            label="Nueva contraseña (mín. 8 caracteres)"
            type="password"
            value={newPassword}
            onValueChange={setNewPassword}
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
            {busy ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      ) : null}

      <AuthFooter>
        <Link to="/login">Volver al inicio de sesión</Link>
      </AuthFooter>
    </AuthPageLayout>
  )
}
