import { useEffect, useState } from 'react'
import { deleteBudget, getBudgets, getCategories, upsertBudget } from '../../api/api.js'
import formStyles from '../forms/Form.module.css'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import CurrencySelect from '../ui/CurrencySelect.jsx'
import { formatAmount } from '../../utils/format.js'
import styles from './BudgetPanel.module.css'

export default function BudgetPanel() {
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({ categoryId: '', amount: '', currency: 'ves' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function load() {
    Promise.all([getBudgets(), getCategories('expense')])
      .then(([b, c]) => {
        setBudgets(b)
        setCategories(c)
      })
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await upsertBudget({
        categoryId: form.categoryId || null,
        amount: Number(form.amount),
        currency: form.currency,
      })
      setForm({ categoryId: '', amount: '', currency: 'ves' })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteBudget(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))

  return (
    <Card>
      <h2 className={styles.title}>Presupuestos mensuales</h2>
      <form className={`${formStyles.form} ${styles.form}`} onSubmit={handleSubmit}>
        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Categoría</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">General (todos los gastos)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Límite</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              placeholder="0.00"
            />
          </div>
          <CurrencySelect
            value={form.currency}
            onChange={(currency) => setForm({ ...form, currency })}
          />
        </div>
        {error && <p className={formStyles.error}>{error}</p>}
        <div className={formStyles.actions}>
          <Button type="submit" disabled={loading}>
            Guardar presupuesto
          </Button>
        </div>
      </form>
      {budgets.length > 0 && (
        <div className={styles.list}>
          {budgets.map((budget) => (
            <div key={budget.id} className={styles.item}>
              <span className={styles.name}>
                {budget.categoryId ? categoryMap[budget.categoryId] : 'General'}
              </span>
              <span className={styles.amount}>
                {formatAmount(budget.amount, budget.currency || 'ves')}
              </span>
              <button
                type="button"
                className={styles.remove}
                onClick={() => handleDelete(budget.id)}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
