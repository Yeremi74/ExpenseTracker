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
    filteredDebts,
    totalsDebt,
    totalsDebtPay,
    totalsDebtReceive,
    addItem,
    removeItem,
  } = useMonthlyDataContext()

  const errBanner = loadError || syncError

  return (
    <SettingsPageLayout
      title="Deudas (mensual)"
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

      <section className={s.monthlyBlock} aria-labelledby="debt-heading">
        <h2 id="debt-heading" className={s.monthlyBlockTitle}>
          Deudas
        </h2>
        <TransactionTable
          variant="debt"
          rows={filteredDebts}
          onRemove={(id) => removeItem('debt', id)}
          totals={totalsDebt}
          totalsPay={totalsDebtPay}
          totalsReceive={totalsDebtReceive}
        />
        <TransactionForm
          variant="debt"
          title="Añadir deuda"
          draft={draftDebt}
          setDraft={setDraftDebt}
          onSubmit={() => addItem('debt', draftDebt, setDraftDebt)}
        />
      </section>
    </SettingsPageLayout>
  )
}
