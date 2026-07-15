import { useState, useEffect } from 'react'
import api from '../api/axios'
import { SkeletonCard, SkeletonTableRows } from '../components/Skeleton'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

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
  negative: 'bg-red-50 text-red-700',
  neutral:  'bg-slate-100 text-slate-600',
}

function StatCard({ label, value, sub, accent = 'default' }) {
  const colors = {
    default: { bg: 'bg-white border-slate-200', val: 'text-slate-800', sub: 'text-slate-400' },
    green:   { bg: 'bg-emerald-50 border-emerald-200', val: 'text-emerald-700', sub: 'text-emerald-500' },
    red:     { bg: 'bg-red-50 border-red-200',         val: 'text-red-700',     sub: 'text-red-400' },
    amber:   { bg: 'bg-amber-50 border-amber-200',     val: 'text-amber-700',   sub: 'text-amber-500' },
    indigo:  { bg: 'bg-indigo-50 border-indigo-200',   val: 'text-indigo-700',  sub: 'text-indigo-400' },
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
  return <p className="text-sm text-slate-400 text-center py-10">{msg}</p>
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BehaviourDashboard() {
  const [incidents, setIncidents] = useState([])
  const [typeReport, setTypeReport] = useState([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const year = String(now.getFullYear())
  // Simple current-term heuristic: month 1-4 = Term 1, 5-8 = Term 2, 9-12 = Term 3
  const month = now.getMonth() + 1
  const term = month <= 4 ? 'Term 1' : month <= 8 ? 'Term 2' : 'Term 3'

  useEffect(() => {
    const ctrl = new AbortController()
    Promise.all([
      api.get('/api/behaviour/incidents', { params: { per_page: 100, academic_year: year }, signal: ctrl.signal }).catch(() => null),
      api.get('/api/behaviour/reports/incident-types', { params: { academic_year: year }, signal: ctrl.signal }).catch(() => null),
    ]).then(([inc, rep]) => {
      setIncidents(inc?.data?.data ?? [])
      setTypeReport(rep?.data?.data ?? [])
      setLoading(false)
    })
    return () => ctrl.abort()
  }, [year])

  const totalIncidents    = incidents.length
  const positivePoints    = incidents.filter(i => i.points > 0).reduce((s, i) => s + i.points, 0)
  const negativePoints    = incidents.filter(i => i.points < 0).reduce((s, i) => s + i.points, 0)
  const unresolvedCount   = incidents.filter(i => i.status === 'recorded' || i.status === 'escalated').length
  const criticalCount     = incidents.filter(i => i.incidentType?.severity === 'critical').length
  const notifiedCount     = incidents.filter(i => i.parent_notified_at).length

  // Top 5 recent
  const recentIncidents = [...incidents].sort((a, b) => new Date(b.incident_date) - new Date(a.incident_date)).slice(0, 8)

  // Watchlist: students with net negative total
  const studentTotals = {}
  incidents.forEach(i => {
    const id = i.student?.id
    if (!id) return
    if (!studentTotals[id]) studentTotals[id] = { student: i.student, points: 0 }
    studentTotals[id].points += i.points
  })
  const watchlist = Object.values(studentTotals).filter(s => s.points < 0).sort((a, b) => a.points - b.points).slice(0, 8)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl px-6 py-5 text-white shadow-sm">
        <p className="text-sm font-medium text-orange-200 mb-0.5">Behaviour Management</p>
        <h2 className="text-xl font-bold">Behaviour Dashboard</h2>
        <p className="text-sm text-orange-200 mt-1">{year} · All terms</p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} rows={2} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Incidents" value={totalIncidents} />
          <StatCard label="Positive Points" value={`+${positivePoints}`} accent="green" />
          <StatCard label="Negative Points" value={negativePoints} accent="red" />
          <StatCard label="Unresolved" value={unresolvedCount} accent="amber" sub="recorded or escalated" />
          <StatCard label="Critical" value={criticalCount} accent="red" sub="severity = critical" />
          <StatCard label="Parent Notified" value={notifiedCount} accent="indigo" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent incidents */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Recent Incidents</h3>
          </div>
          {loading ? (
            <table className="w-full text-sm"><tbody><SkeletonTableRows cols={4} rows={6} /></tbody></table>
          ) : recentIncidents.length === 0 ? (
            <Empty msg="No incident records available." />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentIncidents.map(i => (
                <div key={i.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    {i.student?.first_name?.[0]}{i.student?.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {i.student?.first_name} {i.student?.last_name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{i.incidentType?.name ?? '—'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs font-bold tabular-nums ${i.points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {i.points >= 0 ? `+${i.points}` : i.points}
                    </span>
                    <span className="text-xs text-slate-400">{fmtDate(i.incident_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Watchlist */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Student Watchlist</h3>
            <p className="text-xs text-slate-400 mt-0.5">Students with negative net points</p>
          </div>
          {loading ? (
            <table className="w-full text-sm"><tbody><SkeletonTableRows cols={3} rows={6} /></tbody></table>
          ) : watchlist.length === 0 ? (
            <Empty msg="No students on watchlist." />
          ) : (
            <div className="divide-y divide-slate-100">
              {watchlist.map(({ student, points }) => {
                const standing = points >= 50 ? 'Excellent' : points >= 10 ? 'Good' : points >= -20 ? 'Watchlist' : 'Critical'
                return (
                  <div key={student.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-xs font-bold text-red-600 shrink-0">
                      {student.first_name?.[0]}{student.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-xs text-slate-400">{student.grade_level}{student.section ? ` · ${student.section}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-red-600 tabular-nums">{points}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STANDING_BADGE[standing]}`}>
                        {standing}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Incident type breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Incident Type Breakdown</h3>
          <p className="text-xs text-slate-400 mt-0.5">{year}</p>
        </div>
        {loading ? (
          <table className="w-full text-sm"><thead><tr>{['Type','Category','Severity','Count','Total Points','Students'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead><tbody><SkeletonTableRows cols={6} rows={5} /></tbody></table>
        ) : typeReport.length === 0 ? (
          <Empty msg="No incidents this year." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Incident Type', 'Category', 'Severity', 'Count', 'Total Points', 'Students Affected'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {typeReport.map((row, i) => (
                  <tr key={row.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CAT_BADGE[row.category] ?? 'bg-slate-100 text-slate-600'}`}>
                        {row.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${SEV_BADGE[row.severity] ?? 'bg-slate-100 text-slate-600'}`}>
                        {row.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">{row.incident_count}</td>
                    <td className={`px-4 py-3 font-mono font-semibold ${row.total_points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {row.total_points >= 0 ? `+${row.total_points}` : row.total_points}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.affected_students}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
