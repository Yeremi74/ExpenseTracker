import SettingsPageLayout from '../../components/SettingsPageLayout/SettingsPageLayout.jsx'
import { TransactionForm, TransactionTable } from './MonthlyComponents.jsx'
import { FxRatesPanel, MonthFilterRow } from './MonthlySharedUi.jsx'
import s from './Monthly.module.css'
import { useMonthlyDataContext } from './MonthlyDataContext.jsx'

export default function MonthlyIncomesPage() {
  const {
    rates,
    setRates,
    monthFilter,
    setMonthFilter,
    draftIncome,
    setDraftIncome,
    formError,
    ready,
    loadError,
    syncError,
    saveBusy,
    pendingRemove,
    ratesSyncing,
    filteredIncomes,
    totalsInc,
    saveItem,
    startEditItem,
    cancelEdit,
    removeItem,
    fxRatesPanelRef,
    transactionFormRef,
  } = useMonthlyDataContext()

  const errBanner = loadError || syncError

  return (
    <SettingsPageLayout
      title="Ingresos (mensual)"
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

      <section className={s.monthlyBlock} aria-labelledby="inc-heading">
        <h2 id="inc-heading" className={s.monthlyBlockTitle}>
          Ingresos
        </h2>
        <TransactionTable
          variant="income"
          rows={filteredIncomes}
          pendingRemove={pendingRemove}
          editingId={draftIncome.editId}
          onEdit={(row) => startEditItem('income', row)}
          onRemove={(id) => void removeItem('income', id)}
          totals={totalsInc}
        />
        <TransactionForm
          variant="income"
          title={draftIncome.editId ? 'Editar ingreso' : 'Añadir ingreso'}
          draft={draftIncome}
          setDraft={setDraftIncome}
          submitBusy={saveBusy}
          formRef={transactionFormRef}
          onCancel={() => cancelEdit('income')}
          onSubmit={() =>
            void saveItem('income', draftIncome, setDraftIncome)
          }
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
