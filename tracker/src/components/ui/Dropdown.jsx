import { useEffect, useId, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import styles from './Dropdown.module.css'

const tones = {
  default: styles.toneDefault,
  positive: styles.tonePositive,
  negative: styles.toneNegative,
}

export default function Dropdown({
  value,
  onChange,
  options,
  tone = 'default',
  compact = false,
  align = 'left',
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const listId = useId()
  const selected = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function selectOption(optionValue) {
    onChange(optionValue)
    setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${open ? styles.open : ''} ${className}`}
    >
      <button
        type="button"
        className={`${styles.trigger} ${tones[tone]} ${compact ? styles.compact : ''}`}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
      >
        <span className={styles.triggerLabel}>{selected?.triggerLabel ?? selected?.label}</span>
        {!compact && (
          <Icon name={open ? 'chevronUp' : 'chevronDown'} size={14} className={styles.chevron} />
        )}
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className={`${styles.menu} ${align === 'right' ? styles.menuRight : ''}`}
        >
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={`${styles.option} ${isSelected ? styles.optionSelected : ''} ${
                    option.tone ? tones[option.tone] : ''
                  }`}
                  onClick={() => selectOption(option.value)}
                >
                  <span className={styles.optionLabel}>{option.label}</span>
                  {option.description && (
                    <span className={styles.optionDescription}>{option.description}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
