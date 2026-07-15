import { useTimetableDashboard } from '../modules/timetable/hooks'
import { SkeletonCard, SkeletonTableRows } from '../components/Skeleton'

function fmtDateTime(v) {
  if (!v) return '—'
  return new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function StatCard({ label, value, accent = 'default' }) {
  const colors = {
    default: { bg: 'bg-white border-slate-200', val: 'text-slate-800' },
    indigo:  { bg: 'bg-indigo-50 border-indigo-200', val: 'text-indigo-700' },
    emerald: { bg: 'bg-emerald-50 border-emerald-200', val: 'text-emerald-700' },
    amber:   { bg: 'bg-amber-50 border-amber-200', val: 'text-amber-700' },
    red:     { bg: 'bg-red-50 border-red-200', val: 'text-red-700' },
  }
  const c = colors[accent] ?? colors.default
  return (
    <div className={`rounded-xl border ${c.bg} p-5 shadow-sm`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${c.val}`}>{value ?? '—'}</p>
    </div>
  )
}

function Empty({ msg }) {
  return <p className="text-sm text-slate-400 text-center py-8">{msg}</p>
}

const AVAILABILITY_STATUS_BADGE = {
  unavailable: 'bg-red-50 text-red-600',
  preferred:   'bg-emerald-50 text-emerald-700',
  available:   'bg-slate-100 text-slate-600',
}

export default function TimetableDashboardPage() {
  const { data, loading, error, refetch } = useTimetableDashboard()

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-sm text-red-700 font-medium">Could not load the timetable dashboard.</p>
        <button onClick={refetch} className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl px-6 py-5 text-white shadow-sm">
        <p className="text-sm font-medium text-indigo-200 mb-0.5">Timetable</p>
        <h2 className="text-xl font-bold">Timetable Dashboard</h2>
        <p className="text-sm text-indigo-200 mt-1">Live scheduling overview · current school</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} rows={2} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Active Entries"      value={data?.active_entries}             accent="indigo" />
          <StatCard label="Classes Scheduled"   value={data?.classes_scheduled} />
          <StatCard label="Teachers Scheduled"  value={data?.teachers_scheduled} />
          <StatCard label="Rooms Used"          value={data?.rooms_used} />
          <StatCard label="Unavailable Today"   value={data?.unavailable_teachers_today} accent="red" />
          <StatCard label="Term Buckets"        value={data?.by_term?.length ?? 0}       accent="emerald" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent changes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Recent Timetable Changes</h3>
          </div>
          {loading ? (
            <table className="w-full"><tbody><SkeletonTableRows cols={3} rows={5} /></tbody></table>
          ) : !data?.recent_changes?.length ? (
            <Empty msg="No timetable entries available." />
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recent_changes.map(e => (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {e.subject?.name ?? '—'} · {e.school_class?.name ?? '—'}
                    </p>
                    <p className="text-xs text-slate-400 capitalize">{e.day_of_week} · {e.teacher?.name ?? '—'}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{fmtDateTime(e.updated_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Availability exceptions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Teacher Availability Exceptions</h3>
          </div>
          {loading ? (
            <table className="w-full"><tbody><SkeletonTableRows cols={3} rows={5} /></tbody></table>
          ) : !data?.availability_exceptions?.length ? (
            <Empty msg="No availability exceptions recorded." />
          ) : (
            <div className="divide-y divide-slate-100">
              {data.availability_exceptions.map(a => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{a.teacher?.name ?? '—'}</p>
                    <p className="text-xs text-slate-400 capitalize">{a.day_of_week} · {a.period?.name ?? '—'}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${AVAILABILITY_STATUS_BADGE[a.availability_status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {a.availability_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
