export function simulateSaving({ balance, monthlySaving, months }) {
  const saving = Number(monthlySaving) || 0
  const period = Number(months) || 1
  const projected = balance + saving * period
  return {
    projectedBalance: projected,
    totalSaved: saving * period,
    monthlySaving: saving,
    months: period,
  }
}

export function simulatePurchase({ balance, purchaseAmount, monthlyIncome, monthlyExpenses }) {
  const amount = Number(purchaseAmount) || 0
  const newBalance = balance - amount
  const monthlyNet = (Number(monthlyIncome) || 0) - (Number(monthlyExpenses) || 0)
  const monthsToRecover = monthlyNet > 0 ? amount / monthlyNet : null

  return {
    newBalance,
    canAfford: newBalance >= 0,
    deficit: newBalance < 0 ? Math.abs(newBalance) : 0,
    monthsToRecover: monthsToRecover != null ? Math.ceil(monthsToRecover) : null,
  }
}
