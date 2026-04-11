import { useState } from 'react'
import authStyles from '../../styles/authPages.module.css'

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export default function AuthFormField({
  label,
  type,
  value,
  onValueChange,
  onBlur,
  autoComplete,
  minLength,
  maxLength,
  inputMode,
  required = true,
}) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (passwordVisible ? 'text' : 'password') : type

  const inputProps = {
    autoComplete,
    value,
    onChange: (e) => onValueChange(e.target.value),
    onBlur,
    required,
    minLength,
    maxLength,
    inputMode,
  }

  return (
    <label className={authStyles.field}>
      <span className={authStyles.label}>{label}</span>
      {isPassword ? (
        <div className={authStyles.passwordField}>
          <input
            className={`${authStyles.input} ${authStyles.inputPassword}`}
            type={inputType}
            {...inputProps}
          />
          <button
            type="button"
            className={authStyles.passwordToggle}
            onClick={() => setPasswordVisible((v) => !v)}
            aria-label={
              passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'
            }
            aria-pressed={passwordVisible}
          >
            {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      ) : (
        <input className={authStyles.input} type={inputType} {...inputProps} />
      )}
    </label>
  )
}
