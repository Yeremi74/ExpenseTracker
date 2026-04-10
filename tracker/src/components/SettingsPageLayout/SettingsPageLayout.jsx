import PageShell from '../PageShell/PageShell.jsx'
import PageHeader from '../PageHeader/PageHeader.jsx'
import SyncBanner from '../SyncBanner/SyncBanner.jsx'

export default function SettingsPageLayout({
  title,
  compact = true,
  ready,
  errorMessage,
  loadingLabel = 'Cargando datos…',
  children,
}) {
  return (
    <PageShell>
      <PageHeader title={title} compact={compact} />
      {!ready ? (
        <SyncBanner variant="info">{loadingLabel}</SyncBanner>
      ) : null}
      {errorMessage ? (
        <SyncBanner variant="warn" role="alert">
          {errorMessage}
        </SyncBanner>
      ) : null}
      {children}
    </PageShell>
  )
}
