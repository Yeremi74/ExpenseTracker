import authStyles from '../../styles/authPages.module.css'

export default function AuthFormField({
  label,
  type,
  value,
  onValueChange,
  autoComplete,
  minLength,
  required = true,
}) {
  return (
    <label className={authStyles.field}>
      <span className={authStyles.label}>{label}</span>
      <input
        className={authStyles.input}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        required={required}
        minLength={minLength}
      />
    </label>
  )
}
