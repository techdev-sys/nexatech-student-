import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useParentChild } from '../../context/ParentChildContext'

const STATUS_BADGE = {
  present: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  absent:  'bg-red-50 text-red-600 ring-1 ring-red-200',
  late:    'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  excused: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
}

function AttendanceRing({ percentage }) {
  const r = 28, circ = 2 * Math.PI * r
  const pct = percentage ?? 0
  const dash = (pct / 100) * circ
  const color = pct >= 85 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute text-sm font-bold text-slate-800">{pct}%</span>
    </div>
  )
}

export default function ParentAttendancePage() {
  const { childId } = useParentChild()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [filters, setFilters] = useState({ from_date: '', to_date: '', status: '' })
  const [page, setPage]       = useState(1)

  useEffect(() => {
    if (!childId) return
    setLoading(true)
    setError('')
    api.get(`/api/portal/children/${childId}/attendance`, {
      params: { ...filters, page, per_page: 20 },
    })
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load attendance data.'))
      .finally(() => setLoading(false))
  }, [childId, filters, page])

  if (!childId) return (
    <div className="text-sm text-slate-500 text-center py-16">No child linked to your account.</div>
  )

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Summary */}
      {data?.summary && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Attendance Summary</h3>
          <div className="flex items-center gap-6">
            <AttendanceRing percentage={data.summary.percentage} />
            <div className="grid grid-cols-2 gap-x-10 gap-y-1 text-sm">
              {[
                ['Present', data.summary.present, 'text-emerald-600'],
                ['Absent',  data.summary.absent,  'text-red-500'],
                ['Late',    data.summary.late,     'text-amber-600'],
                ['Excused', data.summary.excused,  'text-blue-600'],
                ['Total',   data.summary.total,    'text-slate-700'],
              ].map(([label, count, cls]) => (
                <div key={label} className="flex justify-between gap-8">
                  <span className="text-slate-500">{label}</span>
                  <span className={`font-semibold ${cls}`}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">From</label>
          <input type="date" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
            value={filters.from_date}
            onChange={e => { setFilters(f => ({ ...f, from_date: e.target.value })); setPage(1) }} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">To</label>
          <input type="date" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
            value={filters.to_date}
            onChange={e => { setFilters(f => ({ ...f, to_date: e.target.value })); setPage(1) }} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Status</label>
          <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
            value={filters.status}
            onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1) }}>
            <option value="">All</option>
            {['present','absent','late','excused'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        <button onClick={() => { setFilters({ from_date:'', to_date:'', status:'' }); setPage(1) }}
          className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5">
          Clear
        </button>
      </div>

      {/* History table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">History</h3>
          {loading && <span className="text-xs text-slate-400 animate-pulse">Loading...</span>}
        </div>
        {error && <p className="px-5 py-3 text-sm text-red-500">{error}</p>}
        {!loading && !error && data?.history?.data?.length === 0 && (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">No records match your filters.</p>
        )}
        {data?.history?.data?.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                {['Date','Subject','Status','Remarks'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.history.data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-2 tabular-nums">{r.date}</td>
                  <td className="px-4 py-2 text-slate-600">{r.subject_name ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{r.remarks ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {/* Pagination */}
        {data?.history?.last_page > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500 text-xs">Page {data.history.current_page} of {data.history.last_page}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50">Prev</button>
              <button disabled={page >= data.history.last_page} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
