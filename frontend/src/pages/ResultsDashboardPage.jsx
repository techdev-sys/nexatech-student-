import { useState, useEffect } from 'react'
import api from '../api/axios'

function StatCard({ label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  }
  return (
    <div className={`rounded-xl p-5 ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

export default function ResultsDashboardPage() {
  const [params, setParams] = useState({
    term: '3', academic_year: '2025',
  })
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => {
    if (!params.term || !params.academic_year) return
    setLoading(true)
    api.get('/api/exams/results/dashboard', { params })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [params.term, params.academic_year])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Results Dashboard</h2>
        <div className="flex items-center gap-2">
          <select value={params.term}
            onChange={e => setParams(p => ({ ...p, term: e.target.value }))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
          <input type="text" value={params.academic_year}
            onChange={e => setParams(p => ({ ...p, academic_year: e.target.value }))}
            placeholder="Year" className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-24" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-xl" />)}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Students Assessed" value={data.students_assessed} color="indigo" />
            <StatCard label="Exams Completed" value={data.exams_completed} color="emerald" />
            <StatCard label="Average Pass Rate" value={`${data.pass_rate}%`} color="blue" />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Top Performing Classes</h3>
              {data.top_classes.length === 0
                ? <p className="text-sm text-slate-400">No records available.</p>
                : <div className="space-y-2">
                    {data.top_classes.map((c, i) => (
                      <div key={c.class_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                          <span className="text-sm font-medium">{c.class_name}</span>
                          <span className="text-xs text-slate-400">{c.student_count} students</span>
                        </div>
                        <span className="text-sm font-semibold text-indigo-700">{c.avg_score}%</span>
                      </div>
                    ))}
                  </div>
              }
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Top Performing Subjects</h3>
              {data.top_subjects.length === 0
                ? <p className="text-sm text-slate-400">No records available.</p>
                : <div className="space-y-2">
                    {data.top_subjects.map((s, i) => (
                      <div key={s.subject_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                          <span className="text-sm font-medium">{s.subject_name}</span>
                          <span className="text-xs text-slate-400">{s.student_count} students</span>
                        </div>
                        <span className="text-sm font-semibold text-emerald-700">{s.avg_score}%</span>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-400 text-center py-12">Select a term and year to load results.</p>
      )}
    </div>
  )
}
