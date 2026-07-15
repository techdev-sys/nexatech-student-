import { useFinanceDashboard } from '../modules/finance/hooks'
import { SkeletonCard } from '../components/Skeleton'

function money(v) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v ?? 0))
}

function StatCard({ label, value, sub, accent = 'default' }) {
  const colors = {
    default: { bg: 'bg-white border-slate-200', val: 'text-slate-800' },
    emerald: { bg: 'bg-emerald-50 border-emerald-200', val: 'text-emerald-700' },
    rose:    { bg: 'bg-rose-50 border-rose-200', val: 'text-rose-700' },
    amber:   { bg: 'bg-amber-50 border-amber-200', val: 'text-amber-700' },
    indigo:  { bg: 'bg-indigo-50 border-indigo-200', val: 'text-indigo-700' },
  }
  const c = colors[accent] ?? colors.default
  return (
    <div className={`rounded-xl border ${c.bg} p-5 shadow-sm`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${c.val}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function FinanceDashboardPage() {
  const { data, loading, error, refetch } = useFinanceDashboard()

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-sm text-red-700 font-medium">Could not load the finance dashboard.</p>
        <button onClick={refetch} className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700">Retry</button>
      </div>
    )
  }

  const net = Number(data?.net_cash_position ?? 0)

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl px-6 py-5 text-white shadow-sm">
        <p className="text-sm font-medium text-emerald-100 mb-0.5">Finance</p>
        <h2 className="text-xl font-bold">Financial Dashboard</h2>
        <p className="text-sm text-emerald-100 mt-1">Cash position · current school</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} rows={2} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Income Today"        value={money(data?.income_today)}        accent="emerald" />
          <StatCard label="Income This Month"   value={money(data?.income_this_month)}   accent="emerald" />
          <StatCard label="Expenses This Month" value={money(data?.expenses_this_month)} accent="rose" />
          <StatCard label="Outstanding Invoices" value={money(data?.outstanding_invoices?.total)} sub={`${data?.outstanding_invoices?.count ?? 0} unpaid`} accent="amber" />
          <StatCard label="Net Cash Position"   value={money(net)} accent={net >= 0 ? 'indigo' : 'rose'} />
        </div>
      )}
    </div>
  )
}
