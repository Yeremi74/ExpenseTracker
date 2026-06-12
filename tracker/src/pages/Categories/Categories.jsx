import { useEffect, useState } from 'react'
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '../../api/api.js'
import formStyles from '../../components/forms/Form.module.css'
import listStyles from '../../components/lists/List.module.css'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import styles from './Categories.module.css'

const emptyForm = { name: '', type: 'expense' }

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function load() {
    getCategories()
      .then(setCategories)
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setError(null)
  }

  function openEdit(category) {
    setForm({ name: category.name, type: category.type })
    setEditingId(category.id)
    setShowForm(true)
    setError(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (editingId) {
        await updateCategory(editingId, form)
      } else {
        await createCategory(form)
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
    if (!confirm('¿Eliminar esta categoría?')) return
    try {
      await deleteCategory(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const incomeCategories = categories.filter((c) => c.type === 'income')
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  return (
    <div>
      <PageHeader
        title="Categorías"
        subtitle="Organiza tus ingresos y gastos"
        action={
          !showForm && (
            <Button onClick={openCreate}>Nueva categoría</Button>
          )
        }
      />

      {error && !showForm && <p className={formStyles.error}>{error}</p>}

      {showForm && (
        <Card className={styles.formCard}>
          <form className={formStyles.form} onSubmit={handleSubmit}>
            <div className={formStyles.row}>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Nombre</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Ej. Salario"
                />
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="income">Ingreso</option>
                  <option value="expense">Gasto</option>
                </select>
              </div>
            </div>
            {error && <p className={formStyles.error}>{error}</p>}
            <div className={formStyles.actions}>
              <Button type="button" variant="ghost" onClick={closeForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {editingId ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className={styles.sections}>
        <CategorySection
          title="Ingresos"
          categories={incomeCategories}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
        <CategorySection
          title="Gastos"
          categories={expenseCategories}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}

function CategorySection({ title, categories, onEdit, onDelete }) {
  return (
    <Card>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {categories.length === 0 ? (
        <EmptyState message="Sin categorías" />
      ) : (
        <div className={listStyles.list}>
          {categories.map((category) => (
            <div key={category.id} className={listStyles.item}>
              <div className={listStyles.info}>
                <span className={listStyles.name}>{category.name}</span>
              </div>
              <div className={listStyles.actions}>
                <button
                  type="button"
                  className={listStyles.iconBtn}
                  onClick={() => onEdit(category)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className={`${listStyles.iconBtn} ${listStyles.iconBtnDanger}`}
                  onClick={() => onDelete(category.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
