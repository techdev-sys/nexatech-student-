import { useState, useEffect } from 'react'
import api from '../api/axios'

export default function ClassResultsPage() {
  const [classes, setClasses]   = useState([])
  const [params, setParams]     = useState({
    class_id: '', term: '3', academic_year: '2025',
  })
  const [results, setResults]   = useState(null)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    api.get('/api/v1/classes').then(r => setClasses(r.data))
  }, [])

  const load = () => {
    if (!params.class_id) return
    setLoading(true)
    api.get('/api/exams/results/class', { params })
      .then(r => setResults(r.data))
      .finally(() => setLoading(false))
  }

  const positionBadge = pos => {
    if (pos === 1) return 'bg-amber-100 text-amber-700'
    if (pos === 2) return 'bg-slate-200 text-slate-700'
    if (pos === 3) return 'bg-orange-100 text-orange-700'
    return 'bg-slate-100 text-slate-600'
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-800">Class Results & Rankings</h2>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Class</label>
            <select value={params.class_id} onChange={e => setParams(p => ({ ...p, class_id: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-40">
              <option value="">Select</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Term</label>
            <select value={params.term} onChange={e => setParams(p => ({ ...p, term: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-28">
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
            <input type="text" value={params.academic_year}
              onChange={e => setParams(p => ({ ...p, academic_year: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-24" />
          </div>
          <button onClick={load} disabled={!params.class_id}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            Load
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-xl" />
        ))}</div>
      ) : results ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="font-semibold text-sm text-slate-800">{results.class?.name}</span>
            <span className="text-xs text-slate-500">Term {results.term} · {results.academic_year} · {results.results?.length ?? 0} students</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Position','Student','Admission No.','Overall Average'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(results.results ?? []).map(r => (
                <tr key={r.student_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-bold ${positionBadge(r.class_position)}`}>
                      {r.class_position ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-slate-500">{r.student_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    {r.overall_average != null
                      ? <span className={`font-semibold ${r.overall_average >= 50 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {r.overall_average}%
                        </span>
                      : <span className="text-slate-400">—</span>
                    }
                  </td>
                </tr>
              ))}
              {results.results?.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No grade records available for this class.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 text-sm">Select a class and click Load to see rankings.</div>
      )}
    </div>
  )
}
