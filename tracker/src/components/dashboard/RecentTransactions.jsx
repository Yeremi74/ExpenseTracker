import { Link } from 'react-router-dom'
import Card from '../ui/Card.jsx'
import { formatAmount, formatDate } from '../../utils/format.js'
import styles from './RecentTransactions.module.css'

export default function RecentTransactions({ transactions }) {
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Últimos movimientos</h2>
        <Link to="/history" className={styles.link}>
          Ver historial
        </Link>
      </div>
      {!transactions?.length ? (
        <p className={styles.empty}>Aún no hay movimientos registrados</p>
      ) : (
        <div className={styles.list}>
          {transactions.map((tx) => (
            <div key={tx.id} className={styles.item}>
              <span className={styles.name}>{tx.title?.trim() || tx.categoryName}</span>
              <span className={styles.meta}>
                {formatDate(tx.date)} · {tx.categoryName}
              </span>
              <span
                className={`${styles.amount} ${
                  tx.type === 'income' ? styles.income : styles.expense
                }`}
              >
                {tx.type === 'income' ? '+' : '-'}
                {formatAmount(tx.amount, tx.currency || 'ves')}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
