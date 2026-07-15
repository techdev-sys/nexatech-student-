import { useState, useEffect } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

export default function ReportCardsPage() {
  const { user } = useAuth()
  const { show: toast } = useToast()
  const isParent = user?.role === 'parent'

  const [students, setStudents] = useState([])
  const [params, setParams]     = useState({
    student_id: '', term: '3', academic_year: '2025',
  })
  const [downloading, setDownloading] = useState(false)
  const [preview, setPreview]   = useState(null)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (isParent) {
      api.get('/api/v1/parent/overview').then(r => {
        if (r.data?.student?.id) {
          setStudents([r.data.student])
          setParams(p => ({ ...p, student_id: r.data.student.id }))
        }
      })
    } else {
      api.get('/api/students', { params: { per_page: 500 } }).then(r =>
        setStudents(r.data?.data ?? r.data)
      )
    }
  }, [isParent])

  const loadPreview = () => {
    if (!params.student_id) return
    setLoading(true)
    api.get(`/api/students/${params.student_id}/report-card`, {
      params: { term: params.term, academic_year: params.academic_year },
    }).then(r => setPreview(r.data)).finally(() => setLoading(false))
  }

  const downloadPdf = async () => {
    if (!params.student_id) return
    setDownloading(true)
    try {
      const res = await api.get(`/api/students/${params.student_id}/report-card/pdf`, {
        params: { term: params.term, academic_year: params.academic_year },
        responseType: 'blob',
      })
      const url  = URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href  = url
      link.download = `report_card_term${params.term}_${params.academic_year}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      toast('PDF downloaded.', 'success')
    } catch {
      toast('PDF generation failed.', 'error')
    } finally {
      setDownloading(false)
    }
  }

  const pct = v => typeof v === 'number' ? `${v.toFixed(1)}%` : '—'

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-800">Report Cards</h2>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-end gap-3 flex-wrap">
          {!isParent && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Student</label>
              <select value={params.student_id} onChange={e => setParams(p => ({ ...p, student_id: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-52">
                <option value="">Select</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Term</label>
            <select value={params.term} onChange={e => setParams(p => ({ ...p, term: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Academic Year</label>
            <input type="text" value={params.academic_year}
              onChange={e => setParams(p => ({ ...p, academic_year: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-24" />
          </div>
          <button onClick={loadPreview} disabled={!params.student_id}
            className="px-4 py-2 text-sm rounded-lg bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50">
            Preview
          </button>
          <button onClick={downloadPdf} disabled={!params.student_id || downloading}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            {downloading ? 'Downloading...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-xl" />
        ))}</div>
      ) : preview ? (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-white rounded-xl border-2 border-slate-800 p-5">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4 mb-4">
              <div>
                <p className="text-xl font-bold uppercase tracking-wide">{preview.school.name}</p>
                <p className="text-xs text-slate-500">Official Academic Report Card</p>
              </div>
              <div className="text-right">
                <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1">TERM {preview.term} REPORT</span>
                <p className="text-xs text-slate-500 mt-1">Academic Year {preview.academic_year}</p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-4 text-sm">
              <div><p className="text-xs text-slate-400 uppercase">Name</p><p className="font-bold">{preview.student.name}</p></div>
              <div><p className="text-xs text-slate-400 uppercase">Adm. No.</p><p className="font-bold">{preview.student.student_number ?? '—'}</p></div>
              <div><p className="text-xs text-slate-400 uppercase">Grade</p><p className="font-bold">{preview.student.grade_level}</p></div>
              <div><p className="text-xs text-slate-400 uppercase">Section</p><p className="font-bold">{preview.student.section ?? '—'}</p></div>
              <div><p className="text-xs text-slate-400 uppercase">Class Position</p>
                <p className="font-bold">{preview.position.class_position ? `${preview.position.class_position}/${preview.position.class_size}` : '—'}</p>
              </div>
            </div>
          </div>

          {/* Subjects */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  {['Subject','Terminal %','Grade','Pos.','Remark'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.subjects.map((s, i) => (
                  <tr key={s.subject.id} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
                    <td className="px-4 py-3 font-medium">{s.subject.name}
                      {s.subject.code && <span className="ml-1 text-xs text-slate-400">({s.subject.code})</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold">{pct(s.terminal_percentage)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${s.is_pass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {s.terminal_letter}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {s.subject_position ? `${s.subject_position}/${s.subject_class_size}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.terminal_label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Subjects Sat', value: preview.summary.subjects_attempted },
              { label: 'Passed', value: preview.summary.subjects_passed, green: true },
              { label: 'Failed', value: preview.summary.subjects_failed, red: true },
              { label: 'Overall Average', value: pct(preview.summary.overall_average), dark: true },
              { label: 'Overall Grade', value: preview.summary.overall_letter, dark: true },
            ].map(({ label, value, green, red, dark }) => (
              <div key={label} className={`rounded-xl p-4 text-center border ${dark ? 'bg-slate-800 border-slate-800 text-white' : green ? 'bg-emerald-50 border-emerald-200' : red ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                <p className={`text-2xl font-bold ${green ? 'text-emerald-700' : red ? 'text-red-600' : ''}`}>{value}</p>
                <p className={`text-xs uppercase mt-1 ${dark ? 'text-slate-300' : 'text-slate-500'}`}>{label}</p>
              </div>
            ))}
          </div>

          {/* Supplementary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase text-slate-500 mb-2">Attendance</p>
              <div className="grid grid-cols-3 gap-1 text-center text-sm">
                <div><p className="text-lg font-bold text-emerald-600">{preview.attendance.present}</p><p className="text-xs text-slate-400">Present</p></div>
                <div><p className="text-lg font-bold text-red-500">{preview.attendance.absent}</p><p className="text-xs text-slate-400">Absent</p></div>
                <div><p className="text-lg font-bold text-amber-500">{preview.attendance.late}</p><p className="text-xs text-slate-400">Late</p></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase text-slate-500 mb-2">Behaviour</p>
              <p className="text-sm">{preview.behaviour.total_incidents} incident(s) · {preview.behaviour.major_incidents} major</p>
              <p className={`font-semibold mt-1 text-sm ${['Excellent','Good'].includes(preview.behaviour.standing) ? 'text-emerald-600' : 'text-amber-600'}`}>
                {preview.behaviour.standing}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase text-slate-500 mb-2">Fee Status</p>
              <p className={`text-lg font-bold ${preview.finance.outstanding > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                ${preview.finance.outstanding.toFixed(2)}
              </p>
              <p className="text-sm text-slate-500">{preview.finance.fee_status}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 text-sm">
          Select a student, term and year then click Preview or Download PDF.
        </div>
      )}
    </div>
  )
}
