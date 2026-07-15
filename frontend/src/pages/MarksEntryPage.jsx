import { useState, useEffect, useRef } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'

export default function MarksEntryPage({ onSaveStatus }) {
  const { show: toast } = useToast()
  const [classes, setClasses]       = useState([])
  const [subjects, setSubjects]     = useState([])
  const [assessments, setAssessments] = useState([])
  const [matrix, setMatrix]         = useState(null)
  const [params, setParams]         = useState({
    class_id: '', subject_id: '', assessment_id: '',
    term: '3', academic_year: '2025',
  })
  const [marks, setMarks]     = useState({})
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(false)
  const saveTimer = useRef(null)

  useEffect(() => {
    api.get('/api/v1/classes').then(r => setClasses(r.data))
  }, [])

  // Load subjects when class changes
  useEffect(() => {
    if (!params.class_id) { setSubjects([]); return }
    api.get(`/api/v1/classes/${params.class_id}/subjects`).then(r => setSubjects(r.data))
    setParams(p => ({ ...p, subject_id: '', assessment_id: '' }))
    setMatrix(null)
  }, [params.class_id])

  // Load assessments when subject/term/year changes
  useEffect(() => {
    if (!params.subject_id || !params.term || !params.academic_year) {
      setAssessments([])
      return
    }
    api.get('/api/assessments', {
      params: { subject_id: params.subject_id, term: params.term, academic_year: params.academic_year },
    }).then(r => {
      const list = r.data?.data ?? r.data
      setAssessments(list)
    })
    setParams(p => ({ ...p, assessment_id: '' }))
    setMatrix(null)
  }, [params.subject_id, params.term, params.academic_year])

  const loadMatrix = () => {
    if (!params.class_id || !params.subject_id) return
    setLoading(true)
    api.get(`/api/v1/classes/${params.class_id}/subjects/${params.subject_id}/grades`, {
      params: { term: params.term, academic_year: params.academic_year },
    }).then(r => {
      setMatrix(r.data)
      // Pre-fill marks from existing data for the selected assessment
      const initial = {}
      r.data.students?.forEach(s => {
        const entry = s.marks?.[String(params.assessment_id)]
        if (entry?.marks_obtained != null) {
          initial[s.student_id] = String(entry.marks_obtained)
        }
      })
      setMarks(initial)
    }).finally(() => setLoading(false))
  }

  const selectedAssessment = assessments.find(a => String(a.id) === String(params.assessment_id))

  const handleMarkChange = (studentId, value) => {
    setMarks(m => ({ ...m, [studentId]: value }))
    // Autosave after 1.5s of inactivity
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => bulkSave({ [studentId]: value }), 1500)
  }

  const bulkSave = async (overrides = null) => {
    if (!params.assessment_id) return
    const marksToSave = overrides
      ? { ...marks, ...overrides }
      : marks

    const grades = Object.entries(marksToSave)
      .filter(([, v]) => v !== '' && v !== null && !isNaN(Number(v)))
      .map(([studentId, score]) => ({ student_id: Number(studentId), score: Number(score) }))

    if (grades.length === 0) return

    setSaving(true)
    onSaveStatus?.('saving')
    try {
      await api.post('/api/grades/bulk', {
        assessment_id: Number(params.assessment_id),
        grades,
      })
      onSaveStatus?.('saved')
      toast(`Saved ${grades.length} mark(s).`, 'success')
    } catch {
      onSaveStatus?.('')
    } finally {
      setSaving(false)
    }
  }

  const sel = (label, key, opts, onChange) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select value={params[key]} onChange={e => {
        const v = e.target.value
        setParams(p => ({ ...p, [key]: v }))
        onChange?.(v)
      }} className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full">
        <option value="">Select</option>
        {opts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  )

  const studentsToShow = matrix?.students ?? []
  const maxMarks = selectedAssessment?.max_marks ?? 100

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-800">Marks Entry</h2>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-5 gap-3">
          {sel('Class', 'class_id', classes.map(c => ({ id: c.id, label: c.name })))}
          {sel('Subject', 'subject_id', subjects.map(s => ({ id: s.id, label: s.name })))}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Term</label>
            <select value={params.term} onChange={e => setParams(p => ({ ...p, term: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full">
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
            <input type="text" value={params.academic_year}
              onChange={e => setParams(p => ({ ...p, academic_year: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div className="flex items-end">
            <button onClick={loadMatrix} disabled={!params.class_id || !params.subject_id}
              className="w-full px-4 py-2 text-sm rounded-lg bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50">
              Load Students
            </button>
          </div>
        </div>

        {assessments.length > 0 && (
          <div className="flex items-end gap-3">
            {sel('Assessment', 'assessment_id', assessments.map(a => ({
              id: a.id, label: `${a.name} (max ${a.max_marks}, weight ${a.weightage}%)`,
            })))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-xl" />
        ))}</div>
      ) : studentsToShow.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">
              {matrix?.class_name} · {matrix?.subject_name}
              {selectedAssessment && ` · ${selectedAssessment.name} (out of ${maxMarks})`}
            </span>
            <div className="flex items-center gap-3">
              {saving && <span className="text-xs text-slate-400 animate-pulse">Saving...</span>}
              {params.assessment_id && (
                <button onClick={() => bulkSave()} disabled={saving}
                  className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                  Save All
                </button>
              )}
            </div>
          </div>
          {!params.assessment_id && (
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-700">
              Select an assessment above to enable marks entry.
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Adm. No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Mark {selectedAssessment ? `(out of ${maxMarks})` : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentsToShow.map(s => {
                const val = marks[s.student_id] ?? ''
                const num = Number(val)
                const valid = val === '' || (!isNaN(num) && num >= 0 && num <= maxMarks)
                return (
                  <tr key={s.student_id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium">{s.name}</td>
                    <td className="px-4 py-2 text-slate-500">{s.admission_number ?? '—'}</td>
                    <td className="px-4 py-2">
                      {params.assessment_id ? (
                        <input
                          type="number"
                          min={0}
                          max={maxMarks}
                          step="0.5"
                          value={val}
                          onChange={e => handleMarkChange(s.student_id, e.target.value)}
                          className={`w-28 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${!valid ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                          placeholder="—"
                        />
                      ) : (
                        <span className="text-slate-400 text-xs">Select assessment</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : matrix ? (
        <div className="text-center py-12 text-slate-400 text-sm">No active students found in this class.</div>
      ) : null}
    </div>
  )
}
