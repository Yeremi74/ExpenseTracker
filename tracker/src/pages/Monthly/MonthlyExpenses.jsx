import SettingsPageLayout from '../../components/SettingsPageLayout/SettingsPageLayout.jsx'
import { TransactionForm, TransactionTable } from './MonthlyComponents.jsx'
import { FxRatesPanel, MonthFilterRow } from './MonthlySharedUi.jsx'
import s from './Monthly.module.css'
import { useMonthlyDataContext } from './MonthlyDataContext.jsx'

export default function MonthlyExpensesPage() {
  const {
    rates,
    setRates,
    monthFilter,
    setMonthFilter,
    draftExpense,
    setDraftExpense,
    formError,
    ready,
    loadError,
    syncError,
    filteredExpenses,
    totalsExp,
    addItem,
    removeItem,
  } = useMonthlyDataContext()

  const errBanner = loadError || syncError

  return (
    <SettingsPageLayout
      title="Gastos (mensual)"
      ready={ready}
      errorMessage={errBanner}
    >
      <FxRatesPanel rates={rates} setRates={setRates} />
      <MonthFilterRow
        monthFilter={monthFilter}
        setMonthFilter={setMonthFilter}
      />

      {formError ? (
        <p className={s.formError} role="alert">
          {formError}
        </p>
      ) : null}

      <section className={s.monthlyBlock} aria-labelledby="exp-heading">
        <h2 id="exp-heading" className={s.monthlyBlockTitle}>
          Gastos
        </h2>
        <TransactionTable
          variant="expense"
          rows={filteredExpenses}
          onRemove={(id) => removeItem('expense', id)}
          totals={totalsExp}
        />
        <TransactionForm
          variant="expense"
          title="Añadir gasto"
          draft={draftExpense}
          setDraft={setDraftExpense}
          onSubmit={() => addItem('expense', draftExpense, setDraftExpense)}
        />
      </section>
    </SettingsPageLayout>
  )
}
