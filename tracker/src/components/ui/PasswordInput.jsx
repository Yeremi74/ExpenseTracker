import { useState } from 'react'
import Icon from './Icon.jsx'
import styles from './PasswordInput.module.css'

export default function PasswordInput({ className = '', ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={styles.wrapper}>
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${styles.input} ${className}`.trim()}
      />
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
      </button>
    </div>
  )
}
