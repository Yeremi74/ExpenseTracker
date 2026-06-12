import styles from './Button.module.css'

const variants = {
  primary: styles.primary,
  ghost: styles.ghost,
  danger: styles.danger,
}

export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      className={`${styles.button} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
