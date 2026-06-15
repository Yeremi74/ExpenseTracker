import { useEffect, useState } from 'react'
import {
  createDebt,
  createDebtPayment,
  deleteDebt,
  deleteDebtPayment,
  getCategories,
  getDebtPayments,
  getDebts,
  settleDebt,
  updateDebt,
} from '../../api/api.js'
import formStyles from '../../components/forms/Form.module.css'
import FormExchangeRates from '../../components/forms/FormExchangeRates.jsx'
import listStyles from '../../components/lists/List.module.css'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import CurrencySelect from '../../components/ui/CurrencySelect.jsx'
import FormSheet from '../../components/ui/FormSheet.jsx'
import IconButton from '../../components/ui/IconButton.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { formatAmount, formatDate, toInputDate, todayInputDate } from '../../utils/format.js'
import styles from './Debts.module.css'

const DEBT_DIRECTIONS = {
  payable: {
    label: 'Yo debo',
    paymentsLabel: 'Pagos',
    paymentAmountLabel: 'Monto del pago',
    paymentSubmitLabel: 'Registrar pago',
    settleLabel: 'Marcar como pagada',
    settledLabel: 'Pagada',
    settleTitle: 'Registrar pago de deuda',
    settleDescription: 'Se creará un gasto por el monto pendiente',
  },
  receivable: {
    label: 'Me deben',
    paymentsLabel: 'Cobros',
    paymentAmountLabel: 'Monto cobrado',
    paymentSubmitLabel: 'Registrar cobro',
    settleLabel: 'Marcar como cobrada',
    settledLabel: 'Cobrada',
    settleTitle: 'Registrar cobro de deuda',
    settleDescription: 'Se creará un ingreso por el monto pendiente',
  },
}

const emptyDebtForm = {
  name: '',
  totalAmount: '',
  currency: 'ves',
  direction: 'payable',
  description: '',
  dueDate: '',
  scheduleType: 'single',
  installmentCount: '',
  installmentIntervalDays: '14',
  firstDueDate: todayInputDate(),
}

const emptyPaymentForm = {
  amount: '',
  date: todayInputDate(),
  note: '',
}

const emptySettleForm = {
  date: todayInputDate(),
  categoryId: '',
}

function isDebtSettled(debt) {
  return debt.paidAmount >= debt.totalAmount
}

function hasInstallments(debt) {
  return Array.isArray(debt.installments) && debt.installments.length > 0
}

function isInstallmentSettled(installment) {
  return (installment.paidAmount || 0) >= installment.amount
}

function getInstallmentStats(debt) {
  const paidCount = debt.installments.filter(isInstallmentSettled).length
  const nextDue = debt.installments.find((inst) => !isInstallmentSettled(inst))?.dueDate
  return {
    paidCount,
    totalCount: debt.installments.length,
    nextDue,
  }
}

function getDebtDirection(debt) {
  return DEBT_DIRECTIONS[debt.direction] ? debt.direction : 'payable'
}

export default function DebtsPage() {
  const [debts, setDebts] = useState([])
  const [form, setForm] = useState(emptyDebtForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [payments, setPayments] = useState([])
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm)
  const [settlingDebt, setSettlingDebt] = useState(null)
  const [settlingInstallment, setSettlingInstallment] = useState(null)
  const [settleForm, setSettleForm] = useState(emptySettleForm)
  const [settleCategories, setSettleCategories] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function load() {
    getDebts()
      .then(setDebts)
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setForm(emptyDebtForm)
    setEditingId(null)
    setShowForm(true)
    setError(null)
  }

  function openEdit(debt) {
    setForm({
      name: debt.name,
      totalAmount: String(debt.totalAmount),
      currency: debt.currency || 'ves',
      direction: getDebtDirection(debt),
      description: debt.description,
      dueDate: toInputDate(debt.dueDate),
      scheduleType: 'single',
      installmentCount: '',
      installmentIntervalDays: '14',
      firstDueDate: todayInputDate(),
    })
    setEditingId(debt.id)
    setShowForm(true)
    setError(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyDebtForm)
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const body = {
        name: form.name,
        totalAmount: Number(form.totalAmount),
        currency: form.currency,
        direction: form.direction,
        description: form.description,
      }

      if (editingId) {
        const existing = debts.find((d) => d.id === editingId)
        await updateDebt(editingId, {
          ...body,
          paidAmount: existing.paidAmount,
          dueDate: form.dueDate || null,
        })
      } else if (form.scheduleType === 'installments') {
        await createDebt({
          ...body,
          installments: {
            count: Number(form.installmentCount),
            intervalDays: Number(form.installmentIntervalDays),
            firstDueDate: form.firstDueDate,
          },
        })
      } else {
        await createDebt({
          ...body,
          dueDate: form.dueDate || null,
        })
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
    if (!confirm('¿Eliminar esta deuda?')) return
    try {
      await deleteDebt(id)
      if (expandedId === id) setExpandedId(null)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function togglePayments(debtId) {
    if (expandedId === debtId) {
      setExpandedId(null)
      setPayments([])
      return
    }
    setExpandedId(debtId)
    setPaymentForm(emptyPaymentForm)
    const debt = debts.find((item) => item.id === debtId)
    if (debt && hasInstallments(debt)) return
    try {
      const data = await getDebtPayments(debtId)
      setPayments(data)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handlePaymentSubmit(e, debt) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await createDebtPayment(debt.id, {
        amount: Number(paymentForm.amount),
        date: paymentForm.date,
        note: paymentForm.note,
      })
      setPaymentForm(emptyPaymentForm)
      load()
      const data = await getDebtPayments(debt.id)
      setPayments(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeletePayment(debtId, paymentId) {
    if (!confirm('¿Eliminar este pago?')) return
    try {
      await deleteDebtPayment(debtId, paymentId)
      load()
      const data = await getDebtPayments(debtId)
      setPayments(data)
    } catch (err) {
      setError(err.message)
    }
  }

  async function openSettle(debt, installment = null) {
    const directionKey = getDebtDirection(debt)
    const categoryType = directionKey === 'receivable' ? 'income' : 'expense'
    setError(null)
    setSettleForm(emptySettleForm)
    setSettlingDebt(debt)
    setSettlingInstallment(installment)
    try {
      const categories = await getCategories(categoryType)
      setSettleCategories(categories)
    } catch (err) {
      setError(err.message)
      setSettlingDebt(null)
      setSettlingInstallment(null)
    }
  }

  function closeSettle() {
    setSettlingDebt(null)
    setSettlingInstallment(null)
    setSettleForm(emptySettleForm)
    setSettleCategories([])
    setError(null)
  }

  async function handleSettleSubmit(e) {
    e.preventDefault()
    if (!settlingDebt) return
    setLoading(true)
    setError(null)
    try {
      await settleDebt(settlingDebt.id, {
        date: settleForm.date,
        categoryId: settleForm.categoryId,
        installmentId: settlingInstallment?.id,
      })
      closeSettle()
      load()
      if (expandedId === settlingDebt.id) {
        setExpandedId(settlingDebt.id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const settlingDirection = settlingDebt ? DEBT_DIRECTIONS[getDebtDirection(settlingDebt)] : null
  const settlingRemaining = settlingInstallment
    ? settlingInstallment.amount - (settlingInstallment.paidAmount || 0)
    : settlingDebt
      ? settlingDebt.totalAmount - settlingDebt.paidAmount
      : 0
  const settlingTitle = settlingInstallment
    ? `${settlingDirection?.settleTitle} · Cuota ${settlingInstallment.number}/${settlingDebt?.installments?.length}`
    : settlingDirection?.settleTitle

  return (
    <div>
      <PageHeader
        title="Deudas"
        subtitle="Controla lo que debes, lo que te deben y registra pagos o cobros"
        action={!showForm && <Button onClick={openCreate}>Nueva deuda</Button>}
      />

      {error && !showForm && !expandedId && !settlingDebt && (
        <p className={formStyles.error}>{error}</p>
      )}

      {settlingDebt && settlingDirection && (
        <FormSheet open={!!settlingDebt} onClose={closeSettle} title={settlingTitle}>
          <p className={styles.settleHint}>{settlingDirection.settleDescription}</p>
          <form className={formStyles.form} onSubmit={handleSettleSubmit}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Deuda</label>
              <input value={settlingDebt.name} readOnly />
            </div>
            {settlingInstallment && (
              <div className={formStyles.field}>
                <label className={formStyles.label}>Cuota</label>
                <input
                  value={`${settlingInstallment.number}/${settlingDebt.installments.length} · Vence ${formatDate(settlingInstallment.dueDate)}`}
                  readOnly
                />
              </div>
            )}
            <div className={formStyles.field}>
              <label className={formStyles.label}>Monto pendiente</label>
              <input
                value={formatAmount(settlingRemaining, settlingDebt.currency)}
                readOnly
              />
            </div>
            <div className={formStyles.row}>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Fecha</label>
                <input
                  type="date"
                  value={settleForm.date}
                  onChange={(e) => setSettleForm({ ...settleForm, date: e.target.value })}
                  required
                />
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Categoría</label>
                <select
                  value={settleForm.categoryId}
                  onChange={(e) =>
                    setSettleForm({ ...settleForm, categoryId: e.target.value })
                  }
                  required
                >
                  <option value="">Seleccionar...</option>
                  {settleCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error && <p className={formStyles.error}>{error}</p>}
            <div className={formStyles.actions}>
              <Button type="button" variant="ghost" onClick={closeSettle}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || settleCategories.length === 0}>
                {settlingDirection.settleLabel}
              </Button>
            </div>
          </form>
        </FormSheet>
      )}

      {showForm && (
        <FormSheet
          open={showForm}
          onClose={closeForm}
          title={editingId ? 'Editar deuda' : 'Nueva deuda'}
        >
          <form className={formStyles.form} onSubmit={handleSubmit}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Título</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Ej. Tarjeta de crédito"
              />
            </div>
            <div className={formStyles.row}>
              <div className={formStyles.field}>
                <label className={formStyles.label}>
                  {form.scheduleType === 'installments' && !editingId
                    ? 'Monto por cuota'
                    : 'Monto total'}
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.totalAmount}
                  onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>
              <CurrencySelect
                value={form.currency}
                onChange={(currency) => setForm({ ...form, currency })}
              />
            </div>
            <FormExchangeRates amount={form.totalAmount} currency={form.currency} />
            {!editingId && (
              <div className={formStyles.field}>
                <label className={formStyles.label}>Registro</label>
                <select
                  value={form.scheduleType}
                  onChange={(e) => setForm({ ...form, scheduleType: e.target.value })}
                >
                  <option value="single">Deuda única</option>
                  <option value="installments">Varias cuotas</option>
                </select>
              </div>
            )}
            <div className={formStyles.row}>
              <div className={formStyles.field}>
                <label className={formStyles.label}>Tipo</label>
                <select
                  value={form.direction}
                  onChange={(e) => setForm({ ...form, direction: e.target.value })}
                  required
                >
                  <option value="payable">Yo debo</option>
                  <option value="receivable">Me deben</option>
                </select>
              </div>
              {form.scheduleType === 'single' || editingId ? (
                <div className={formStyles.field}>
                  <label className={formStyles.label}>Fecha límite</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  />
                </div>
              ) : (
                <div className={formStyles.field}>
                  <label className={formStyles.label}>Próxima cuota</label>
                  <input
                    type="date"
                    value={form.firstDueDate}
                    onChange={(e) => setForm({ ...form, firstDueDate: e.target.value })}
                    required
                  />
                </div>
              )}
            </div>
            {!editingId && form.scheduleType === 'installments' && (
              <div className={`${formStyles.row} ${styles.installmentFormRow}`}>
                <div className={formStyles.field}>
                  <label className={formStyles.label}>Cantidad de cuotas</label>
                  <input
                    type="number"
                    min="2"
                    step="1"
                    value={form.installmentCount}
                    onChange={(e) => setForm({ ...form, installmentCount: e.target.value })}
                    required
                    placeholder="Ej. 6"
                  />
                </div>
                <div className={formStyles.field}>
                  <label className={formStyles.label}>Cada cuántos días</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.installmentIntervalDays}
                    onChange={(e) =>
                      setForm({ ...form, installmentIntervalDays: e.target.value })
                    }
                    required
                    placeholder="Ej. 14"
                  />
                </div>
              </div>
            )}
            <div className={formStyles.field}>
              <label className={formStyles.label}>Descripción</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Opcional"
              />
            </div>
            {error && <p className={formStyles.error}>{error}</p>}
            <div className={formStyles.actions}>
              <Button type="button" variant="ghost" onClick={closeForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {editingId
                  ? 'Guardar'
                  : form.scheduleType === 'installments'
                    ? 'Registrar deuda'
                    : 'Registrar'}
              </Button>
            </div>
          </form>
        </FormSheet>
      )}

      <Card>
        {debts.length === 0 ? (
          <EmptyState message="Sin deudas registradas" />
        ) : (
          <div className={styles.debtList}>
            {debts.map((debt) => {
              const remaining = debt.totalAmount - debt.paidAmount
              const progress = Math.round((debt.paidAmount / debt.totalAmount) * 100)
              const isExpanded = expandedId === debt.id
              const directionKey = getDebtDirection(debt)
              const direction = DEBT_DIRECTIONS[directionKey]
              const isReceivable = directionKey === 'receivable'
              const settled = isDebtSettled(debt)
              const installmentDebt = hasInstallments(debt)
              const installmentStats = installmentDebt ? getInstallmentStats(debt) : null

              return (
                <div
                  key={debt.id}
                  className={`${styles.debtItem} ${settled ? styles.debtItemSettled : ''}`}
                >
                  <div className={listStyles.item}>
                    <div className={listStyles.info}>
                      <span className={listStyles.name}>
                        {debt.name}
                        <span
                          className={`${styles.directionBadge} ${
                            isReceivable ? styles.directionReceivable : styles.directionPayable
                          }`}
                        >
                          {direction.label}
                        </span>
                        {settled && (
                          <span className={styles.settledBadge}>{direction.settledLabel}</span>
                        )}
                        {installmentDebt && !settled && (
                          <span className={styles.installmentBadge}>
                            {installmentStats.totalCount} cuotas
                          </span>
                        )}
                      </span>
                      <span className={listStyles.meta}>
                        {formatAmount(debt.paidAmount, debt.currency)} de {formatAmount(debt.totalAmount, debt.currency)}
                        {installmentDebt
                          ? ` · ${installmentStats.paidCount}/${installmentStats.totalCount} cuotas pagadas`
                          : debt.dueDate
                            ? ` · Vence ${formatDate(debt.dueDate)}`
                            : ''}
                        {installmentStats?.nextDue && ` · Próxima ${formatDate(installmentStats.nextDue)}`}
                        {debt.description && ` · ${debt.description}`}
                      </span>
                      <div className={styles.progressBar}>
                        <div
                          className={`${styles.progressFill} ${
                            isReceivable ? styles.progressFillReceivable : ''
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <span
                      className={`${listStyles.amount} ${
                        isReceivable ? listStyles.amountPositive : listStyles.amountWarning
                      }`}
                    >
                      {formatAmount(remaining, debt.currency)}
                    </span>
                    <div className={listStyles.actions}>
                      {!settled && !installmentDebt && (
                        <Button
                          variant="ghost"
                          className={styles.settleBtn}
                          onClick={() => openSettle(debt)}
                        >
                          {direction.settleLabel}
                        </Button>
                      )}
                      <IconButton
                        icon={isExpanded ? 'chevronUp' : 'receipt'}
                        label={
                          isExpanded
                            ? 'Cerrar'
                            : installmentDebt
                              ? 'Cuotas'
                              : direction.paymentsLabel
                        }
                        onClick={() => togglePayments(debt.id)}
                      />
                      <IconButton
                        icon="edit"
                        label="Editar"
                        variant="edit"
                        onClick={() => openEdit(debt)}
                      />
                      <IconButton
                        icon="trash"
                        label="Eliminar"
                        variant="danger"
                        onClick={() => handleDelete(debt.id)}
                      />
                    </div>
                  </div>

                  {isExpanded && installmentDebt && (
                    <div className={styles.paymentsPanel}>
                      <div className={styles.installmentsList}>
                        {debt.installments.map((installment) => {
                          const installmentSettled = isInstallmentSettled(installment)
                          return (
                            <div
                              key={installment.id}
                              className={`${styles.installmentItem} ${
                                installmentSettled ? styles.installmentItemSettled : ''
                              }`}
                            >
                              <div className={styles.installmentInfo}>
                                <span className={styles.installmentTitle}>
                                  Cuota {installment.number}/{debt.installments.length}
                                </span>
                                <span className={styles.installmentMeta}>
                                  Vence {formatDate(installment.dueDate)}
                                </span>
                              </div>
                              <span className={styles.installmentAmount}>
                                {formatAmount(installment.amount, debt.currency)}
                              </span>
                              {installmentSettled ? (
                                <span className={styles.settledBadge}>{direction.settledLabel}</span>
                              ) : (
                                <Button
                                  variant="ghost"
                                  className={styles.settleBtn}
                                  onClick={() => openSettle(debt, installment)}
                                >
                                  {direction.settleLabel}
                                </Button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {isExpanded && !installmentDebt && (
                    <div className={styles.paymentsPanel}>
                      <form
                        className={`${formStyles.form} ${styles.paymentForm}`}
                        onSubmit={(e) => handlePaymentSubmit(e, debt)}
                      >
                        <div className={formStyles.row}>
                          <div className={formStyles.field}>
                            <label className={formStyles.label}>
                              {direction.paymentAmountLabel} ({debt.currency === 'usd_bcv' ? 'USD BCV' : debt.currency === 'usdt' ? 'USDT' : 'Bs.'})
                            </label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              max={remaining}
                              value={paymentForm.amount}
                              onChange={(e) =>
                                setPaymentForm({ ...paymentForm, amount: e.target.value })
                              }
                              required
                              placeholder="0.00"
                            />
                          </div>
                          <div className={formStyles.field}>
                            <label className={formStyles.label}>Fecha</label>
                            <input
                              type="date"
                              value={paymentForm.date}
                              onChange={(e) =>
                                setPaymentForm({ ...paymentForm, date: e.target.value })
                              }
                              required
                            />
                          </div>
                        </div>
                        <div className={formStyles.field}>
                          <label className={formStyles.label}>Nota</label>
                          <input
                            value={paymentForm.note}
                            onChange={(e) =>
                              setPaymentForm({ ...paymentForm, note: e.target.value })
                            }
                            placeholder="Opcional"
                          />
                        </div>
                        {error && <p className={formStyles.error}>{error}</p>}
                        <div className={formStyles.actions}>
                          <Button type="submit" disabled={loading || remaining <= 0}>
                            {direction.paymentSubmitLabel}
                          </Button>
                        </div>
                      </form>

                      {payments.length > 0 && (
                        <div className={styles.paymentsList}>
                          {payments.map((payment) => (
                            <div key={payment.id} className={styles.paymentRow}>
                              <span>{formatDate(payment.date)}</span>
                              <span className={styles.paymentAmount}>
                                {formatAmount(payment.amount, debt.currency)}
                              </span>
                              <span className={styles.paymentNote}>
                                {payment.note || '—'}
                              </span>
                              <IconButton
                                icon="trash"
                                label="Eliminar pago"
                                variant="danger"
                                onClick={() => handleDeletePayment(debt.id, payment.id)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
