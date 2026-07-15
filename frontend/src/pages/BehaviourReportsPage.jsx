import { useState } from 'react'
import api from '../api/axios'
import { usePermissions } from '../hooks/usePermissions'
import { SkeletonTableRows } from '../components/Skeleton'

// ── Badge helpers ─────────────────────────────────────────────────────────────

const STANDING_BADGE = {
  Excellent: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Good:      'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  Watchlist: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Critical:  'bg-red-50 text-red-700 ring-1 ring-red-200',
}

const SEV_BADGE = {
  low:      'bg-slate-100 text-slate-600',
  medium:   'bg-amber-50 text-amber-700',
  high:     'bg-orange-50 text-orange-700',
  critical: 'bg-red-50 text-red-700',
}

const CAT_BADGE = {
  positive: 'bg-emerald-50 text-emerald-700',
  negative: 'bg-red-50 text-red-600',
  neutral:  'bg-slate-100 text-slate-600',
}

function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Empty({ msg }) {
  return <p className="text-sm text-slate-400 text-center py-10">{msg}</p>
}

// ── Reusable filter bar ───────────────────────────────────────────────────────

function FilterBar({ filters, onChange, onRun, loading }) {
  const set = k => e => onChange(f => ({ ...f, [k]: e.target.value }))
  return (
    <div className="flex flex-wrap items-end gap-3 bg-slate-50 rounded-xl p-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Term</label>
        <select value={filters.term} onChange={set('term')}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All terms</option>
          <option>Term 1</option><option>Term 2</option><option>Term 3</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
        <input type="text" value={filters.academic_year} onChange={set('academic_year')} placeholder="2026"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-24" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
        <input type="date" value={filters.from_date} onChange={set('from_date')}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
        <input type="date" value={filters.to_date} onChange={set('to_date')}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36" />
      </div>
      <button onClick={onRun} disabled={loading}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition">
        {loading ? 'Loading...' : 'Run Report'}
      </button>
      <button disabled
        className="px-4 py-2 border border-slate-200 text-sm text-slate-400 rounded-lg cursor-not-allowed">
        Export CSV
      </button>
      <button disabled
        className="px-4 py-2 border border-slate-200 text-sm text-slate-400 rounded-lg cursor-not-allowed">
        Print
      </button>
    </div>
  )
}

// ── Class Behaviour Report ────────────────────────────────────────────────────

function ClassReport() {
  const [filters, setFilters] = useState({ term: '', academic_year: String(new Date().getFullYear()), from_date: '', to_date: '' })
  const [rows, setRows]       = useState(null)
  const [loading, setLoading] = useState(false)

  const run = () => {
    setLoading(true)
    const params = {}
    if (filters.term)          params.term          = filters.term
    if (filters.academic_year) params.academic_year = filters.academic_year
    if (filters.from_date)     params.from_date     = filters.from_date
    if (filters.to_date)       params.to_date       = filters.to_date
    api.get('/api/behaviour/reports/class', { params })
      .then(r => setRows(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  return (
    <div className="space-y-4">
      <FilterBar filters={filters} onChange={setFilters} onRun={run} loading={loading} />
      {rows === null ? null : rows.length === 0 ? <Empty msg="No data for this filter." /> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Student', 'Grade', 'Incidents', 'Positive Pts', 'Negative Pts', 'Total Pts', 'Standing'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.student?.id ?? i} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.student?.first_name} {r.student?.last_name}</td>
                  <td className="px-4 py-3 text-slate-500">{r.student?.grade_level}{r.student?.section ? ` ${r.student.section}` : ''}</td>
                  <td className="px-4 py-3 font-mono">{r.incident_count}</td>
                  <td className="px-4 py-3 font-mono text-emerald-600">+{r.positive_points}</td>
                  <td className="px-4 py-3 font-mono text-red-600">{r.negative_points}</td>
                  <td className={`px-4 py-3 font-mono font-bold ${r.total_points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {r.total_points >= 0 ? `+${r.total_points}` : r.total_points}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STANDING_BADGE[r.standing] ?? 'bg-slate-100 text-slate-600'}`}>
                      {r.standing}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Student Behaviour History ─────────────────────────────────────────────────

function StudentHistoryReport() {
  const [filters, setFilters] = useState({ term: '', academic_year: '', from_date: '', to_date: '' })
  const [rows, setRows]       = useState(null)
  const [loading, setLoading] = useState(false)

  const run = () => {
    setLoading(true)
    const params = { per_page: 200 }
    if (filters.term)          params.term          = filters.term
    if (filters.academic_year) params.academic_year = filters.academic_year
    if (filters.from_date)     params.from_date     = filters.from_date
    if (filters.to_date)       params.to_date       = filters.to_date
    api.get('/api/behaviour/reports/student', { params })
      .then(r => setRows(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  return (
    <div className="space-y-4">
      <FilterBar filters={filters} onChange={setFilters} onRun={run} loading={loading} />
      {rows === null ? null : rows.length === 0 ? <Empty msg="No incidents for this filter." /> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Date', 'Student', 'Grade', 'Incident Type', 'Points', 'Reported By', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(r.incident_date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{r.student?.first_name} {r.student?.last_name}</td>
                  <td className="px-4 py-3 text-slate-500">{r.student?.grade_level}</td>
                  <td className="px-4 py-3 text-slate-700">{r.incidentType?.name ?? '—'}</td>
                  <td className={`px-4 py-3 font-mono font-bold ${r.points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {r.points >= 0 ? `+${r.points}` : r.points}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.reportedBy?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                      r.status === 'resolved' ? 'bg-emerald-50 text-emerald-700' :
                      r.status === 'escalated' ? 'bg-red-50 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Incident Type Report ──────────────────────────────────────────────────────

function IncidentTypeReport() {
  const [filters, setFilters] = useState({ term: '', academic_year: String(new Date().getFullYear()), from_date: '', to_date: '' })
  const [rows, setRows]       = useState(null)
  const [loading, setLoading] = useState(false)

  const run = () => {
    setLoading(true)
    const params = {}
    if (filters.term)          params.term          = filters.term
    if (filters.academic_year) params.academic_year = filters.academic_year
    if (filters.from_date)     params.from_date     = filters.from_date
    if (filters.to_date)       params.to_date       = filters.to_date
    api.get('/api/behaviour/reports/incident-types', { params })
      .then(r => setRows(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  return (
    <div className="space-y-4">
      <FilterBar filters={filters} onChange={setFilters} onRun={run} loading={loading} />
      {rows === null ? null : rows.length === 0 ? <Empty msg="No data for this filter." /> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Incident Type', 'Category', 'Severity', 'Count', 'Total Points', 'Students Affected'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CAT_BADGE[r.category] ?? 'bg-slate-100 text-slate-600'}`}>{r.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${SEV_BADGE[r.severity] ?? 'bg-slate-100 text-slate-600'}`}>{r.severity}</span>
                  </td>
                  <td className="px-4 py-3 font-mono">{r.incident_count}</td>
                  <td className={`px-4 py-3 font-mono font-bold ${r.total_points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {r.total_points >= 0 ? `+${r.total_points}` : r.total_points}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.affected_students}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const REPORTS = [
  { key: 'class',    label: 'Class Behaviour Report' },
  { key: 'history',  label: 'Student Behaviour History' },
  { key: 'types',    label: 'Incident Type Report' },
]

export default function BehaviourReportsPage() {
  const { can } = usePermissions()
  const [active, setActive] = useState('class')

  if (!can('view_behaviour')) {
    return <div className="py-16 text-center text-slate-400 text-sm">You do not have permission to view behaviour reports.</div>
  }

  return (
    <div className="space-y-4">
      {/* Report tabs */}
      <div className="flex border-b border-slate-200 gap-0">
        {REPORTS.map(r => (
          <button key={r.key} onClick={() => setActive(r.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              active === r.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {r.label}
          </button>
        ))}
      </div>

      <div>
        {active === 'class'   && <ClassReport />}
        {active === 'history' && <StudentHistoryReport />}
        {active === 'types'   && <IncidentTypeReport />}
      </div>
    </div>
  )
}
