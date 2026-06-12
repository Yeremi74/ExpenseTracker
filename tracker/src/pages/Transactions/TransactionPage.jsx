import { useEffect, useState } from 'react'
import {
  createTransaction,
  deleteTransaction,
  getCategories,
  getTransactions,
  updateTransaction,
} from '../../api/api.js'
import formStyles from '../../components/forms/Form.module.css'
import listStyles from '../../components/lists/List.module.css'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import CurrencySelect from '../../components/ui/CurrencySelect.jsx'
import IconButton from '../../components/ui/IconButton.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { formatAmount, formatDate, toInputDate, todayInputDate } from '../../utils/format.js'
import styles from './TransactionPage.module.css'

const config = {
  income: {
    title: 'Ingresos',
    subtitle: 'Registra tus entradas de dinero',
    amountClass: listStyles.amountPositive,
    emptyMessage: 'Sin ingresos registrados',
    createLabel: 'Nuevo ingreso',
  },
  expense: {
    title: 'Gastos',
    subtitle: 'Registra tus salidas de dinero',
    amountClass: listStyles.amountNegative,
    emptyMessage: 'Sin gastos registrados',
    createLabel: 'Nuevo gasto',
  },
}

function emptyForm(type) {
  return {
    title: '',
    amount: '',
    currency: 'ves',
    categoryId: '',
    description: '',
    date: todayInputDate(),
    type,
  }
}

function getTransactionLabel(tx, categoryMap) {
  return tx.title?.trim() || categoryMap[tx.categoryId] || 'Sin título'
}

export default function TransactionPage({ type }) {
  const cfg = config[type]
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyForm(type))
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function load() {
    Promise.all([getTransactions({ type }), getCategories(type)])
      .then(([txs, cats]) => {
        setTransactions(txs)
        setCategories(cats)
      })
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    load()
  }, [type])

  function openCreate() {
    setForm(emptyForm(type))
    setEditingId(null)
    setShowForm(true)
    setError(null)
  }

  function openEdit(tx) {
    setForm({
      title: tx.title || '',
      amount: String(tx.amount),
      currency: tx.currency || 'ves',
      categoryId: tx.categoryId,
      description: tx.description,
      date: toInputDate(tx.date),
      type,
    })
    setEditingId(tx.id)
    setShowForm(true)
    setError(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm(type))
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const body = {
        type,
        title: form.title,
        amount: Number(form.amount),
        currency: form.currency,
        categoryId: form.categoryId,
        description: form.description,
        date: form.date,
      }
      if (editingId) {
        await updateTransaction(editingId, body)
      } else {
        await createTransaction(body)
      }
      closeForm()
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro?')) return
    try {
      await deleteTransaction(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))

  return (
    <div>
      <PageHeader
        title={cfg.title}
        subtitle={cfg.subtitle}
        action={!showForm && <Button onClick={openCreate}>{cfg.createLabel}</Button>}
      />

      {error && !showForm && <p className={formStyles.error}>{error}</p>}

      {showForm && (
        <Card className={styles.formCard}>
          <form className={formStyles.form} onSubmit={handleSubmit}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Título</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej. Salario, Supermercado..."
              />
            </div>
            <div className={formStyles.row}>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Monto</label>
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
            <div className={formStyles.row}>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Categoría</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  required
                >
                  <option value="">Seleccionar</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Fecha</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Descripción</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>
            {categories.length === 0 && (
              <p className={formStyles.error}>
                Crea una categoría de {type === 'income' ? 'ingreso' : 'gasto'} primero.
              </p>
            )}
            {error && <p className={formStyles.error}>{error}</p>}
            <div className={formStyles.actions}>
              <Button type="button" variant="ghost" onClick={closeForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || categories.length === 0}>
                {editingId ? 'Guardar' : 'Registrar'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {transactions.length === 0 ? (
          <EmptyState message={cfg.emptyMessage} />
        ) : (
          <div className={listStyles.list}>
            {transactions.map((tx) => (
              <div key={tx.id} className={listStyles.item}>
                <div className={listStyles.info}>
                  <span className={listStyles.name}>
                    {getTransactionLabel(tx, categoryMap)}
                  </span>
                  <span className={listStyles.meta}>
                    {categoryMap[tx.categoryId] || 'Sin categoría'}
                    {` · ${formatDate(tx.date)}`}
                    {tx.description && ` · ${tx.description}`}
                  </span>
                </div>
                <span className={`${listStyles.amount} ${cfg.amountClass}`}>
                  {type === 'income' ? '+' : '-'}
                  {formatAmount(tx.amount, tx.currency || 'ves')}
                </span>
                <div className={listStyles.actions}>
                  <IconButton
                    icon="edit"
                    label="Editar"
                    variant="edit"
                    onClick={() => openEdit(tx)}
                  />
                  <IconButton
                    icon="trash"
                    label="Eliminar"
                    variant="danger"
                    onClick={() => handleDelete(tx.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
