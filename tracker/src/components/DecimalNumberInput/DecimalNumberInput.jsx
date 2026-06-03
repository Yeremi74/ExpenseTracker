function formatStepped(n, min) {
  const clamped = Math.max(min, n)
  if (!Number.isFinite(clamped)) return ''
  if (Number.isInteger(clamped)) return String(clamped)
  return String(Number(clamped.toPrecision(12)))
}

/**
 * Input numérico con decimales. Las flechas del navegador y ↑/↓ avanzan de 1 en 1
 * (step="any" permite decimales al escribir; el paso por defecto del spinner es 1).
 */
export function DecimalNumberInput({
  value,
  onChange,
  className,
  min = 0,
  required,
  onKeyDown: onKeyDownProp,
  ...rest
}) {
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
      onChange={(e) => onChange(e.target.value)}
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
