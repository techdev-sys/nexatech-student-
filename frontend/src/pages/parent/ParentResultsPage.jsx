import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import { useParentChild } from '../../context/ParentChildContext'

const GRADE_BADGE = {
  A: 'bg-emerald-50 text-emerald-700',
  B: 'bg-blue-50 text-blue-700',
  C: 'bg-amber-50 text-amber-700',
  D: 'bg-orange-50 text-orange-600',
  E: 'bg-red-50 text-red-600',
  F: 'bg-red-100 text-red-700',
}

export default function ParentResultsPage() {
  const { childId, childStudentId } = useParentChild()
  const { show: toast } = useToast()

  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [expanded, setExpanded]     = useState({})
  const [downloading, setDownloading] = useState(null)
  const [filters, setFilters]       = useState({ term: '', academic_year: '' })

  useEffect(() => {
    if (!childId) return
    setLoading(true)
    setError('')
    api.get(`/api/portal/children/${childId}/results`, {
      params: { term: filters.term || undefined, academic_year: filters.academic_year || undefined },
    })
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load results.'))
      .finally(() => setLoading(false))
  }, [childId, filters])

  const downloadPdf = async (term, academicYear) => {
    const key = `${term}-${academicYear}`
    setDownloading(key)
    try {
      const res = await api.get(`/api/students/${childId}/report-card/pdf`, {
        params: { term, academic_year: academicYear },
        responseType: 'blob',
      })
      const url  = URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href     = url
      link.download = `report_card_term${term}_${academicYear}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      toast('PDF downloaded.', 'success')
    } catch {
      toast('PDF generation failed.', 'error')
    } finally {
      setDownloading(null)
    }
  }

  if (!childId) return (
    <div className="text-sm text-slate-500 text-center py-16">No child linked to your account.</div>
  )

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Note about published gate */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
        Results are available once the school publishes exam results (completed exam sessions only).
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Term</label>
          <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
            value={filters.term} onChange={e => setFilters(f => ({ ...f, term: e.target.value }))}>
            <option value="">All Terms</option>
            {['1','2','3'].map(t => <option key={t} value={t}>Term {t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Year</label>
          <input type="text" placeholder="2026" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-28"
            value={filters.academic_year} onChange={e => setFilters(f => ({ ...f, academic_year: e.target.value }))} />
        </div>
        {loading && <span className="text-xs text-slate-400 animate-pulse self-center">Loading...</span>}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && data?.results?.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-12 text-center">
          <p className="text-slate-400 text-sm">No published results found.</p>
          <p className="text-slate-300 text-xs mt-1">Results will appear here once your school completes an exam session.</p>
        </div>
      )}

      {data?.results?.map(session => (
        <div key={`${session.term}-${session.academic_year}`} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Session header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">{session.session_name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Term {session.term} · {session.academic_year}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-indigo-700 tabular-nums">{session.average_score}%</p>
                <p className="text-xs text-slate-400">Average</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setExpanded(e => ({ ...e, [`${session.term}-${session.academic_year}`]: !e[`${session.term}-${session.academic_year}`] }))}
                  className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                  {expanded[`${session.term}-${session.academic_year}`] ? 'Collapse' : 'View Marks'}
                </button>
                <button
                  onClick={() => downloadPdf(session.term, session.academic_year)}
                  disabled={downloading === `${session.term}-${session.academic_year}`}
                  className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-60">
                  {downloading === `${session.term}-${session.academic_year}` ? 'Generating...' : 'PDF'}
                </button>
              </div>
            </div>
          </div>

          {/* Marks detail */}
          {expanded[`${session.term}-${session.academic_year}`] && (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  {['Subject','Assessment','Score','Weighted','Grade','Remarks'].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {session.grades.map((g, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-2 font-medium text-slate-700">{g.subject ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{g.assessment ?? '—'}</td>
                    <td className="px-4 py-2 tabular-nums">{g.score}</td>
                    <td className="px-4 py-2 tabular-nums">{g.weighted_score}</td>
                    <td className="px-4 py-2">
                      {g.grade_letter ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${GRADE_BADGE[g.grade_letter] ?? 'bg-slate-100 text-slate-600'}`}>
                          {g.grade_letter}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-slate-400 text-xs">{g.remarks ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  )
}
