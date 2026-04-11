export function convertToTriple(rawAmount, unit, usdtBs, bcvUsdBs) {
  const amount = Number(rawAmount)
  const rU = Number(usdtBs)
  const rD = Number(bcvUsdBs)
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Importe no válido')
  }
  if (!Number.isFinite(rU) || rU <= 0) {
    throw new Error('Indica el precio del USDT en bolívares')
  }
  if (!Number.isFinite(rD) || rD <= 0) {
    throw new Error('Indica el precio del dólar BCV en bolívares')
  }

  let bs
  let usdt
  let usdBcv

  if (unit === 'usdt') {
    usdt = amount
    bs = amount * rU
    usdBcv = bs / rD
  } else if (unit === 'bs') {
    bs = amount
    usdBcv = bs / rD
    usdt = bs / rU
  } else if (unit === 'usd_bcv') {
    usdBcv = amount
    bs = amount * rD
    usdt = bs / rU
  } else {
    throw new Error('Unidad no válida')
  }

  return {
    bs: snap(bs, 4),
    usdt: snap(usdt, 6),
    usdBcv: snap(usdBcv, 4),
  }
}

/** True cuando falta o es inválido el precio USDT o BCV usado en la conversión. */
export function isFxRatesValidationError(err) {
  const msg = err?.message ?? ''
  return (
    msg.includes('precio del USDT') || msg.includes('precio del dólar BCV')
  )
}

function snap(n, decimals) {
  const f = 10 ** decimals
  return Math.round(n * f) / f
}
