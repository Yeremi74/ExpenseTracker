import SettingsPageLayout from '../../components/SettingsPageLayout/SettingsPageLayout.jsx'
import { TransactionForm, TransactionTable } from './MonthlyComponents.jsx'
import { FxRatesPanel, MonthFilterRow } from './MonthlySharedUi.jsx'
import s from './Monthly.module.css'
import { useMonthlyDataContext } from './MonthlyDataContext.jsx'

export default function MonthlyDebtsPage() {
  const {
    rates,
    setRates,
    monthFilter,
    setMonthFilter,
    draftDebt,
    setDraftDebt,
    formError,
    ready,
    loadError,
    syncError,
    saveBusy,
    pendingRemove,
    ratesSyncing,
    filteredDebts,
    totalsDebt,
    totalsDebtPay,
    totalsDebtReceive,
    addItem,
    removeItem,
    fxRatesPanelRef,
  } = useMonthlyDataContext()

  const errBanner = loadError || syncError

  return (
    <SettingsPageLayout
      title="Deudas (mensual)"
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

      <section className={s.monthlyBlock} aria-labelledby="debt-heading">
        <h2 id="debt-heading" className={s.monthlyBlockTitle}>
          Deudas
        </h2>
        <TransactionTable
          variant="debt"
          rows={filteredDebts}
          pendingRemove={pendingRemove}
          onRemove={(id) => void removeItem('debt', id)}
          totals={totalsDebt}
          totalsPay={totalsDebtPay}
          totalsReceive={totalsDebtReceive}
        />
        <TransactionForm
          variant="debt"
          title="Añadir deuda"
          draft={draftDebt}
          setDraft={setDraftDebt}
          submitBusy={saveBusy}
          onSubmit={() => void addItem('debt', draftDebt, setDraftDebt)}
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
