import authStyles from '../../styles/authPages.module.css'

export default function AuthFooter({ children }) {
  return <p className={authStyles.footer}>{children}</p>
}
