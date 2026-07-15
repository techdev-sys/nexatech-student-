import { useState, useEffect } from 'react'
import api from '../api/axios'
import { usePermissions } from '../hooks/usePermissions'
import { SkeletonCard, SkeletonTableRows } from '../components/Skeleton'

function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_BADGE = {
  draft:      'bg-slate-100 text-slate-600',
  scheduled:  'bg-blue-50 text-blue-700',
  queued:     'bg-blue-50 text-blue-700',
  processing: 'bg-amber-50 text-amber-700',
  completed:  'bg-emerald-50 text-emerald-700',
  failed:     'bg-red-50 text-red-700',
  cancelled:  'bg-slate-100 text-slate-500',
}

const CH_BADGE = {
  sms:          'bg-indigo-50 text-indigo-700',
  email:        'bg-sky-50 text-sky-700',
  announcement: 'bg-purple-50 text-purple-700',
}

function StatCard({ label, value, sub, accent = 'default' }) {
  const colors = {
    default: { bg: 'bg-white border-slate-200', val: 'text-slate-800', sub: 'text-slate-400' },
    green:   { bg: 'bg-emerald-50 border-emerald-200', val: 'text-emerald-700', sub: 'text-emerald-500' },
    red:     { bg: 'bg-red-50 border-red-200',         val: 'text-red-700',     sub: 'text-red-400' },
    indigo:  { bg: 'bg-indigo-50 border-indigo-200',   val: 'text-indigo-700',  sub: 'text-indigo-400' },
    sky:     { bg: 'bg-sky-50 border-sky-200',         val: 'text-sky-700',     sub: 'text-sky-500' },
    purple:  { bg: 'bg-purple-50 border-purple-200',   val: 'text-purple-700',  sub: 'text-purple-400' },
  }
  const c = colors[accent] ?? colors.default
  return (
    <div className={`rounded-xl border ${c.bg} p-5 shadow-sm`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${c.val}`}>{value ?? '—'}</p>
      {sub && <p className={`text-xs mt-1 ${c.sub}`}>{sub}</p>}
    </div>
  )
}

function Empty({ msg }) {
  return <p className="text-sm text-slate-400 text-center py-8">{msg}</p>
}

export default function CommsDashboard() {
  const { can } = usePermissions()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!can('view_delivery_logs')) { setLoading(false); return }
    const ctrl = new AbortController()
    api.get('/api/communications/dashboard', { signal: ctrl.signal })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  // Teachers and parents see a simplified view (announcements only via their own endpoint)
  if (!can('view_delivery_logs')) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-600 to-sky-600 rounded-2xl px-6 py-5 text-white shadow-sm">
          <p className="text-sm font-medium text-indigo-200 mb-0.5">Communication Center</p>
          <h2 className="text-xl font-bold">Communications</h2>
          <p className="text-sm text-indigo-200 mt-1">Use the Announcements section to post school notices.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-sky-600 rounded-2xl px-6 py-5 text-white shadow-sm">
        <p className="text-sm font-medium text-indigo-200 mb-0.5">Communication Center</p>
        <h2 className="text-xl font-bold">Communications Dashboard</h2>
        <p className="text-sm text-indigo-200 mt-1">SQL-aggregated · All channels</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} rows={2} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="SMS Today"           value={data?.sms_sent_today}       accent="indigo" />
          <StatCard label="Emails Today"        value={data?.emails_sent_today}    accent="sky" />
          <StatCard label="Success Rate"        value={`${data?.success_rate ?? 0}%`} accent="green" />
          <StatCard label="Failed Deliveries"   value={data?.failed_deliveries}    accent="red" />
          <StatCard label="Active Announcements"value={data?.active_announcements} accent="purple" />
          <StatCard label="Queued"
            value={Object.values(data?.delivery_breakdown ?? {}).reduce((s, v) => s + Number(v), 0)}
            sub="total deliveries tracked" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent communications */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Recent Communications</h3>
          </div>
          {loading ? (
            <table className="w-full"><tbody><SkeletonTableRows cols={3} rows={6} /></tbody></table>
          ) : !data?.recent_communications?.length ? (
            <Empty msg="No communication records available." />
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recent_communications.map(c => (
                <div key={c.id} className="flex items-start gap-3 px-5 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 mt-0.5 ${CH_BADGE[c.channel] ?? 'bg-slate-100 text-slate-600'}`}>
                    {c.channel}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.subject || c.body?.slice(0, 50)}</p>
                    <p className="text-xs text-slate-400">{c.audience_type} · {fmtDate(c.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[c.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {c.status}
                    </span>
                    <span className="text-xs text-slate-400">{c.total_recipients} recipients</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delivery status breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Delivery Status Breakdown</h3>
          </div>
          {loading ? (
            <table className="w-full"><tbody><SkeletonTableRows cols={2} rows={5} /></tbody></table>
          ) : !data?.delivery_breakdown || Object.keys(data.delivery_breakdown).length === 0 ? (
            <Empty msg="No delivery records available." />
          ) : (
            <div className="divide-y divide-slate-100">
              {Object.entries(data.delivery_breakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between px-5 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {status}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-slate-700">{Number(count).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Volume by day */}
      {!loading && data?.volume_by_day?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Volume by Day (Last 7 Days)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Channel</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.volume_by_day.map((row, i) => (
                  <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                    <td className="px-4 py-2 text-slate-600">{row.date}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CH_BADGE[row.channel] ?? 'bg-slate-100 text-slate-600'}`}>{row.channel}</span>
                    </td>
                    <td className="px-4 py-2 text-right font-bold tabular-nums text-slate-700">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
