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
    saveBusy,
    pendingRemove,
    ratesSyncing,
    filteredExpenses,
    totalsExp,
    addItem,
    removeItem,
    fxRatesPanelRef,
  } = useMonthlyDataContext()

  const errBanner = loadError || syncError

  return (
    <SettingsPageLayout
      title="Gastos (mensual)"
      ready={ready}
      errorMessage={errBanner}
    >
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
          pendingRemove={pendingRemove}
          onRemove={(id) => void removeItem('expense', id)}
          totals={totalsExp}
        />
        <TransactionForm
          variant="expense"
          title="Añadir gasto"
          draft={draftExpense}
          setDraft={setDraftExpense}
          submitBusy={saveBusy}
          onSubmit={() => void addItem('expense', draftExpense, setDraftExpense)}
          fxPanel={
            <FxRatesPanel
              ref={fxRatesPanelRef}
              embedded
              rates={rates}
              setRates={setRates}
              ratesSyncing={ratesSyncing}
            />
          }
        />
      </section>
    </SettingsPageLayout>
  )
}
