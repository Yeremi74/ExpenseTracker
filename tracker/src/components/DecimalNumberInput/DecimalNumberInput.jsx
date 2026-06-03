import { useRef } from 'react'

const SPINNER_ZONE_PX = 28

function formatStepped(n, min) {
  const clamped = Math.max(min, n)
  if (!Number.isFinite(clamped)) return ''
  if (Number.isInteger(clamped)) return String(clamped)
  return String(Number(clamped.toPrecision(12)))
}

function isSpinnerClick(el, clientX) {
  const rect = el.getBoundingClientRect()
  return clientX >= rect.right - SPINNER_ZONE_PX
}

/**
 * Input numérico: permite decimales al escribir; flechas del navegador y ↑/↓ suman o restan 1.
 */
export function DecimalNumberInput({
  value,
  onChange,
  className,
  min = 0,
  required,
  onMouseDown: onMouseDownProp,
  onChange: onChangeProp,
  onKeyDown: onKeyDownProp,
  ...rest
}) {
  const skipNextChange = useRef(false)

  function stepBy(direction) {
    const base = parseFloat(value)
    const n = Number.isFinite(base) ? base : 0
    const next = direction === 'up' ? n + 1 : n - 1
    onChange(formatStepped(next, min))
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      step="any"
      value={value}
      required={required}
      className={className}
      onMouseDown={(e) => {
        if (isSpinnerClick(e.currentTarget, e.clientX)) {
          e.preventDefault()
          const rect = e.currentTarget.getBoundingClientRect()
          const dir = e.clientY < rect.top + rect.height / 2 ? 'up' : 'down'
          skipNextChange.current = true
          stepBy(dir)
        }
        onMouseDownProp?.(e)
      }}
      onChange={(e) => {
        if (skipNextChange.current) {
          skipNextChange.current = false
          return
        }
        onChange(e.target.value)
        onChangeProp?.(e)
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          stepBy('up')
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          stepBy('down')
        }
        onKeyDownProp?.(e)
      }}
      {...rest}
    />
  )
}
