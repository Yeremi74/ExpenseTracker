import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import Card from '../ui/Card.jsx'
import { formatCurrency, formatPercent } from '../../utils/format.js'
import styles from './DashboardCharts.module.css'

const COLORS = [
  '#111827',
  '#059669',
  '#d97706',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#65a30d',
]

function CategoryTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload

  return (
    <div>
      <strong>{item.name}</strong>
      <div>{formatCurrency(item.amount)}</div>
      <div>{formatPercent(item.percentage * 100, 1)}</div>
    </div>
  )
}

export default function ExpenseCategoryChart({ items, total }) {
  const topItems = items?.slice(0, 6) ?? []
  const hasData = total > 0

  return (
    <Card className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div>
          <h2 className={styles.chartTitle}>Gastos por categoría</h2>
          <p className={styles.chartSubtitle}>Distribución del mes actual</p>
        </div>
      </div>
      <div className={styles.chartBody}>
        {!hasData ? (
          <div className={styles.emptyChart}>Sin gastos registrados este mes</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={topItems}
                dataKey="amount"
                nameKey="name"
                innerRadius="58%"
                outerRadius="82%"
                paddingAngle={2}
                stroke="none"
              >
                {topItems.map((item, index) => (
                  <Cell key={item.categoryId || item.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CategoryTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      {hasData && (
        <div className={styles.categoryList}>
          {topItems.map((item, index) => (
            <div key={item.categoryId || item.name} className={styles.categoryRow}>
              <span
                className={styles.categoryDot}
                style={{ background: COLORS[index % COLORS.length] }}
              />
              <span className={styles.categoryName}>{item.name}</span>
              <span className={styles.categoryAmount}>
                {formatPercent(item.percentage * 100, 0)} · {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
