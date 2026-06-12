import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Card from '../ui/Card.jsx'
import { formatChartAmount, formatCurrency } from '../../utils/format.js'
import styles from './DashboardCharts.module.css'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className={styles.tooltip}>
      <strong>{label}</strong>
      {payload.map((entry) => (
        <div key={entry.dataKey}>
          {entry.name}: {formatCurrency(entry.value)}
        </div>
      ))}
    </div>
  )
}

export default function MonthlyTrendChart({ periods }) {
  const hasData = periods?.some((period) => period.income > 0 || period.expenses > 0)

  return (
    <Card className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div>
          <h2 className={styles.chartTitle}>Ingresos vs gastos</h2>
          <p className={styles.chartSubtitle}>Últimos 6 meses en bolívares</p>
        </div>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#059669' }} />
            Ingresos
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#dc2626' }} />
            Gastos
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#111827' }} />
            Neto
          </span>
        </div>
      </div>
      <div className={styles.chartBody}>
        {!hasData ? (
          <div className={styles.emptyChart}>Sin movimientos en los últimos meses</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={periods} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatChartAmount}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend content={() => null} />
              <Bar dataKey="income" name="Ingresos" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="expenses" name="Gastos" fill="#fca5a5" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Line
                type="monotone"
                dataKey="net"
                name="Neto"
                stroke="#111827"
                strokeWidth={2}
                dot={{ r: 3, fill: '#111827' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}
