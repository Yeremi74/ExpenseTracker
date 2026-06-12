import Icon from './Icon.jsx'
import styles from './IconButton.module.css'

const variants = {
  default: '',
  edit: styles.edit,
  danger: styles.danger,
}

export default function IconButton({
  icon,
  label,
  onClick,
  variant = 'default',
  className = '',
  ...props
}) {
  return (
    <button
      type="button"
      className={`${styles.button} ${variants[variant]} ${className}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon name={icon} />
    </button>
  )
}
