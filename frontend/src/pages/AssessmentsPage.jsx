import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'

const BLANK = { subject_id: '', grading_system_id: '', name: '', academic_year: String(new Date().getFullYear()), term: '1', weightage: '', max_marks: '100' }

function AssessmentForm({ initial, subjects, gradingSystems, onSave, onClose }) {
  const [form, setForm]     = useState(initial ? { ...initial, grading_system_id: initial.grading_system_id ?? '' } : BLANK)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Weightage warning: sum for this subject+term+year
  const [siblingWeight, setSiblingWeight] = useState(0)
  useEffect(() => {
    if (!form.subject_id || !form.term || !form.academic_year) return
    api.get('/api/assessments', { params: { subject_id: form.subject_id, term: form.term, academic_year: form.academic_year } })
      .then(r => {
        const list = r.data?.data ?? r.data
        const sum = list
          .filter(a => !initial?.id || a.id !== initial.id)
          .reduce((s, a) => s + Number(a.weightage), 0)
        setSiblingWeight(sum)
      })
  }, [form.subject_id, form.term, form.academic_year, initial?.id])

  const total = siblingWeight + Number(form.weightage || 0)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const payload = {
        ...form,
        grading_system_id: form.grading_system_id || null,
        term: Number(form.term),
        weightage: Number(form.weightage),
        max_marks: Number(form.max_marks),
        subject_id: Number(form.subject_id),
      }
      if (initial?.id) {
        const { data } = await api.patch(`/api/assessments/${initial.id}`, payload)
        onSave(data, 'updated')
      } else {
        const { data } = await api.post('/api/assessments', payload)
        onSave(data, 'created')
      }
    } catch (err) {
      setErrors(err.response?.data?.errors ?? { _: err.response?.data?.message ?? 'Failed.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
            <select value={form.subject_id} onChange={set('subject_id')} required
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.subject_id ? 'border-red-400' : 'border-slate-200'}`}>
              <option value="">Select</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade_level})</option>)}
            </select>
            {errors.subject_id && <p className="text-xs text-red-500 mt-1">{errors.subject_id[0]}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Assessment name</label>
            <input value={form.name} onChange={set('name')} required
              placeholder="Mid-term Test"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.name ? 'border-red-400' : 'border-slate-200'}`} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Term</label>
            <select value={form.term} onChange={set('term')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Academic year</label>
            <input type="number" value={form.academic_year} onChange={set('academic_year')} min={2020} max={2099}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Max marks</label>
            <input type="number" value={form.max_marks} onChange={set('max_marks')} min={1}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.max_marks ? 'border-red-400' : 'border-slate-200'}`} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Weightage (%) <span className="text-slate-400 font-normal">— contribution to terminal grade</span>
          </label>
          <input type="number" value={form.weightage} onChange={set('weightage')} min={1} max={100} required
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.weightage ? 'border-red-400' : 'border-slate-200'}`} />
          {form.subject_id && form.weightage && (
            <p className={`text-xs mt-1 font-medium ${total === 100 ? 'text-emerald-600' : total > 100 ? 'text-red-500' : 'text-amber-600'}`}>
              {total === 100 ? 'Total weightage is 100% and ready for use.' : total > 100 ? `Total weightage = ${total}% exceeds 100%` : `Total weightage for this subject/term = ${total}% (${100 - total}% remaining)`}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Grading system <span className="text-slate-400 font-normal">(optional — uses school default if blank)</span></label>
          <select value={form.grading_system_id} onChange={set('grading_system_id')}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">Use school default</option>
            {gradingSystems.map(g => <option key={g.id} value={g.id}>{g.name}{g.is_default ? ' (default)' : ''}</option>)}
          </select>
        </div>

        {errors._ && <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{errors._}</div>}
      </div>
      <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
          {saving ? 'Saving...' : initial?.id ? 'Save changes' : 'Add assessment'}
        </button>
      </div>
    </form>
  )
}

export default function AssessmentsPage() {
  const toast = useToast()
  const [assessments, setAssessments] = useState([])
  const [subjects, setSubjects]       = useState([])
  const [gradingSystems, setGs]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [termFilter, setTermFilter]       = useState('')
  const [yearFilter, setYearFilter]       = useState(String(new Date().getFullYear()))
  const [modal, setModal]             = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/subjects'),
      api.get('/api/grading-systems'),
    ]).then(([s, g]) => {
      setSubjects(s.data?.data ?? s.data)
      setGs(g.data?.data ?? g.data)
    })
  }, [])

  const fetch = useCallback(() => {
    setLoading(true)
    const params = { academic_year: yearFilter }
    if (subjectFilter) params.subject_id = subjectFilter
    if (termFilter)    params.term = termFilter
    api.get('/api/assessments', { params })
      .then(r => setAssessments(r.data?.data ?? r.data))
      .catch(() => toast.error('Failed to load assessments.'))
      .finally(() => setLoading(false))
  }, [subjectFilter, termFilter, yearFilter])

  useEffect(() => { fetch() }, [fetch])

  const handleSaved = (_, mode) => { setModal(null); toast.success(`Assessment ${mode}.`); fetch() }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await api.delete(`/api/assessments/${deleteTarget.id}`); toast.success('Assessment deleted.'); setDeleteTarget(null); fetch() }
    catch { } finally { setDeleting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">All subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={termFilter} onChange={e => setTermFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">All terms</option>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
          <input type="number" value={yearFilter} onChange={e => setYearFilter(e.target.value)} min={2020} max={2099}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-24" />
        </div>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Assessment
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        {loading ? (
          <div className="p-8 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />)}</div>
        ) : assessments.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No assessments found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Term</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Year</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Weight</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Max Marks</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {assessments.map((a, i) => (
                <tr key={a.id} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{a.name}</td>
                  <td className="px-4 py-3 text-slate-600">{a.subject?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-500">T{a.term}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{a.academic_year}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-indigo-600">{a.weightage}%</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">{a.max_marks}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setModal(a)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeleteTarget(a)} className="p-1.5 text-slate-400 hover:text-red-600 rounded transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Assessment' : 'Edit Assessment'} onClose={() => setModal(null)} maxWidth="max-w-xl">
          <AssessmentForm
            initial={modal === 'add' ? null : modal}
            subjects={subjects}
            gradingSystems={gradingSystems}
            onSave={handleSaved}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        message="All grades recorded against this assessment will also be removed."
        confirmLabel="Delete assessment"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
