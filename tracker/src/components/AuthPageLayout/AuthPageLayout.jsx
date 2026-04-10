import PageShell from '../PageShell/PageShell.jsx'
import authStyles from '../../styles/authPages.module.css'

export default function AuthPageLayout({ title, lead, children }) {
  return (
    <PageShell>
      <div className={authStyles.page}>
        <h1 className={authStyles.title}>{title}</h1>
        <p className={authStyles.lead}>{lead}</p>
        {children}
      </div>
    </PageShell>
  )
}
