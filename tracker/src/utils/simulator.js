import { convertToVes } from './currency.js'

export function simulateBalanceOperations({
  startingAmount,
  startingCurrency,
  operations,
  rates,
}) {
  let balanceVes = convertToVes(startingAmount, startingCurrency, rates)
  const steps = []

  if (Number(startingAmount) > 0) {
    steps.push({
      label: 'Balance inicial',
      balanceVes,
    })
  }

  for (const op of operations) {
    const amount = Number(op.amount) || 0
    if (amount <= 0) continue

    const amountVes = convertToVes(amount, op.currency, rates)
    balanceVes = op.type === 'add' ? balanceVes + amountVes : balanceVes - amountVes

    steps.push({
      label: op.type === 'add' ? 'Después de sumar' : 'Después de restar',
      balanceVes,
      operation: op,
    })
  }

  return {
    steps,
    balanceVes,
  }
}
