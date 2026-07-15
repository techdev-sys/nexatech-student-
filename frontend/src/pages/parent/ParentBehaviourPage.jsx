import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useParentChild } from '../../context/ParentChildContext'

const STANDING_STYLE = {
  Excellent: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Good:      'bg-blue-50   text-blue-700   ring-1 ring-blue-200',
  Watchlist: 'bg-amber-50  text-amber-700  ring-1 ring-amber-200',
  Critical:  'bg-red-50    text-red-700    ring-1 ring-red-200',
}

const CATEGORY_STYLE = {
  positive: 'bg-emerald-50 text-emerald-700',
  negative: 'bg-red-50 text-red-600',
  neutral:  'bg-slate-100 text-slate-600',
}

export default function ParentBehaviourPage() {
  const { childId } = useParentChild()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [page, setPage]       = useState(1)
  const [filters, setFilters] = useState({ term: '', academic_year: '' })

  useEffect(() => {
    if (!childId) return
    setLoading(true)
    setError('')
    api.get(`/api/portal/children/${childId}/behaviour`, {
      params: { ...filters, page, per_page: 20 },
    })
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load behaviour data.'))
      .finally(() => setLoading(false))
  }, [childId, filters, page])

  if (!childId) return (
    <div className="text-sm text-slate-500 text-center py-16">No child linked to your account.</div>
  )

  const summary = data?.summary
  const incidents = data?.incidents

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Summary card */}
      {summary && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Behaviour Summary</h3>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STANDING_STYLE[summary.standing] ?? 'bg-slate-100 text-slate-600'}`}>
              {summary.standing}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-slate-800 tabular-nums">{summary.incident_count}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total Incidents</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-emerald-700 tabular-nums">+{summary.positive_points}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Positive Points</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-red-600 tabular-nums">{summary.negative_points}</p>
              <p className="text-xs text-red-500 mt-0.5">Negative Points</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Term</label>
          <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
            value={filters.term}
            onChange={e => { setFilters(f => ({ ...f, term: e.target.value })); setPage(1) }}>
            <option value="">All Terms</option>
            {['1','2','3'].map(t => <option key={t} value={t}>Term {t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Year</label>
          <input type="text" placeholder="2026" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-28"
            value={filters.academic_year}
            onChange={e => { setFilters(f => ({ ...f, academic_year: e.target.value })); setPage(1) }} />
        </div>
        <button onClick={() => { setFilters({ term:'', academic_year:'' }); setPage(1) }}
          className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5">Clear</button>
      </div>

      {/* Incidents list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Incident History</h3>
          {loading && <span className="text-xs text-slate-400 animate-pulse">Loading...</span>}
        </div>
        {error && <p className="px-5 py-3 text-sm text-red-500">{error}</p>}
        {!loading && !error && incidents?.data?.length === 0 && (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">No behaviour incidents recorded.</p>
        )}
        {incidents?.data?.length > 0 && (
          <div className="divide-y divide-slate-100">
            {incidents.data.map(inc => (
              <div key={inc.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {inc.type && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_STYLE[inc.type.category] ?? 'bg-slate-100 text-slate-600'}`}>
                          {inc.type.name}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{inc.incident_date}</span>
                      {inc.academic_year && (
                        <span className="text-xs text-slate-400">Term {inc.term} · {inc.academic_year}</span>
                      )}
                    </div>
                    {inc.description && (
                      <p className="text-sm text-slate-600">{inc.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold tabular-nums ${(inc.points ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {(inc.points ?? 0) >= 0 ? '+' : ''}{inc.points}
                    </p>
                    <p className="text-xs text-slate-400">pts</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {incidents?.last_page > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500 text-xs">Page {incidents.current_page} of {incidents.last_page}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50">Prev</button>
              <button disabled={page >= incidents.last_page} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
