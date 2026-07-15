import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import { useParentChild } from '../../context/ParentChildContext'

export default function ParentReportCardsPage() {
  const { childId } = useParentChild()
  const { show: toast } = useToast()

  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [preview, setPreview]       = useState(null)
  const [previewing, setPreviewing] = useState(null)
  const [downloading, setDownloading] = useState(null)

  useEffect(() => {
    if (!childId) return
    setLoading(true)
    api.get(`/api/portal/children/${childId}/report-cards`)
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load report cards.'))
      .finally(() => setLoading(false))
  }, [childId])

  const loadPreview = async (term, academicYear) => {
    const key = `${term}-${academicYear}`
    setPreviewing(key)
    try {
      const r = await api.get(`/api/students/${childId}/report-card`, {
        params: { term, academic_year: academicYear },
      })
      setPreview({ ...r.data, key })
    } catch {
      toast('Failed to load report card.', 'error')
    } finally {
      setPreviewing(null)
    }
  }

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

  if (loading) return <div className="text-center py-16 text-slate-400 text-sm">Loading...</div>
  if (error)   return <p className="text-sm text-red-500">{error}</p>

  const reportCards = data?.report_cards ?? []

  return (
    <div className="space-y-6 max-w-4xl">
      {reportCards.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-12 text-center">
          <svg className="w-12 h-12 text-slate-200 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-slate-400 text-sm">No report cards available.</p>
          <p className="text-slate-300 text-xs mt-1">Report cards will appear once exam sessions are completed.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {reportCards.map(rc => {
              const key = `${rc.term}-${rc.academic_year}`
              return (
                <div key={key} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-800">{rc.session_name}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">Term {rc.term} · {rc.academic_year}</p>
                      {rc.start_date && (
                        <p className="text-xs text-slate-400 mt-0.5">{rc.start_date} – {rc.end_date}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => previewing === key ? setPreview(null) : loadPreview(rc.term, rc.academic_year)}
                        disabled={previewing === key}
                        className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                        {previewing === key ? 'Loading...' : preview?.key === key ? 'Hide' : 'Preview'}
                      </button>
                      <button onClick={() => downloadPdf(rc.term, rc.academic_year)}
                        disabled={downloading === key}
                        className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-60">
                        {downloading === key ? 'Generating...' : 'Download PDF'}
                      </button>
                    </div>
                  </div>

                  {/* Inline preview */}
                  {preview?.key === key && (
                    <div className="mt-5 border-t border-slate-100 pt-5">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        {[
                          ['Subjects', preview.summary?.subjects_attempted],
                          ['Average',  `${preview.summary?.overall_average ?? '—'}%`],
                          ['Position', preview.position?.class_position ?? '—'],
                        ].map(([label, val]) => (
                          <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                            <p className="text-xl font-bold text-slate-800">{val}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                          </div>
                        ))}
                      </div>
                      {preview.subjects?.length > 0 && (
                        <table className="w-full text-sm">
                          <thead className="text-xs text-slate-500 uppercase tracking-wide bg-slate-50">
                            <tr>
                              {['Subject','Average','Grade'].map(h => (
                                <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {preview.subjects.map(s => (
                              <tr key={s.subject_id}>
                                <td className="px-3 py-2 font-medium">{s.subject_name}</td>
                                <td className="px-3 py-2 tabular-nums">{s.weighted_average ?? '—'}%</td>
                                <td className="px-3 py-2">
                                  <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                                    {s.grade_letter ?? '—'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
