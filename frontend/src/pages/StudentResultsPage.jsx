import { useState, useEffect } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function StudentResultsPage() {
  const { user } = useAuth()
  const isParent = user?.role === 'parent'

  const [students, setStudents] = useState([])
  const [params, setParams]     = useState({
    student_id: '', term: '3', academic_year: '2025',
  })
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isParent) {
      // Parent sees only their child — load via overview endpoint
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

  const load = () => {
    if (!params.student_id) return
    setLoading(true)
    api.get(`/api/students/${params.student_id}/report-card`, {
      params: { term: params.term, academic_year: params.academic_year },
    }).then(r => setData(r.data)).finally(() => setLoading(false))
  }

  const pct = v => typeof v === 'number' ? `${v.toFixed(1)}%` : '—'

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-800">Student Results</h2>

      {!isParent && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-end gap-3 flex-wrap">
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
              <input type="text" value={params.academic_year}
                onChange={e => setParams(p => ({ ...p, academic_year: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-24" />
            </div>
            <button onClick={load} disabled={!params.student_id}
              className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
              Load Results
            </button>
          </div>
        </div>
      )}

      {isParent && (
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Term</label>
            <select value={params.term} onChange={e => setParams(p => ({ ...p, term: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="1">Term 1</option><option value="2">Term 2</option><option value="3">Term 3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
            <input type="text" value={params.academic_year}
              onChange={e => setParams(p => ({ ...p, academic_year: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-24" />
          </div>
          <button onClick={load} disabled={!params.student_id}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            View Results
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-xl" />
        ))}</div>
      ) : data ? (
        <div className="space-y-4">
          {/* Student header */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-slate-800">{data.student.name}</p>
              <p className="text-sm text-slate-500">{data.student.student_number} · {data.student.grade_level} {data.student.section ?? ''}</p>
              <p className="text-sm text-slate-500">Term {data.term}, {data.academic_year}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">{pct(data.summary.overall_average)}</p>
              <p className="text-sm text-slate-500">{data.summary.overall_letter} · {data.summary.overall_label}</p>
              {data.position.class_position && (
                <p className="text-xs text-slate-400 mt-1">Position {data.position.class_position}/{data.position.class_size}</p>
              )}
            </div>
          </div>

          {/* Subject results */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Subject','Terminal %','Grade','Position'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.subjects.map(s => (
                  <tr key={s.subject.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{s.subject.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${s.is_pass ? 'bg-emerald-500' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(s.terminal_percentage, 100)}%` }} />
                        </div>
                        <span className={`font-semibold text-xs ${s.is_pass ? 'text-emerald-600' : 'text-red-500'}`}>
                          {pct(s.terminal_percentage)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${s.is_pass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {s.terminal_letter}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {s.subject_position ? `${s.subject_position}/${s.subject_class_size}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary panels */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Attendance</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xl font-bold text-emerald-600">{data.attendance.present}</p><p className="text-xs text-slate-400">Present</p></div>
                <div><p className="text-xl font-bold text-red-500">{data.attendance.absent}</p><p className="text-xs text-slate-400">Absent</p></div>
                <div><p className="text-xl font-bold text-amber-500">{data.attendance.late}</p><p className="text-xs text-slate-400">Late</p></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Behaviour</p>
              <p className="text-xl font-bold text-slate-800">{data.behaviour.total_incidents} incidents</p>
              <p className={`text-sm font-medium mt-1 ${
                data.behaviour.standing === 'Excellent' || data.behaviour.standing === 'Good'
                  ? 'text-emerald-600' : 'text-amber-600'
              }`}>{data.behaviour.standing}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Fees</p>
              <p className={`text-xl font-bold ${data.finance.outstanding > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                ${data.finance.outstanding.toFixed(2)}
              </p>
              <p className="text-sm text-slate-500 mt-1">{data.finance.fee_status}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
