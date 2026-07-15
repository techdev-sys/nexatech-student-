import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'

const BLANK = { name: '', code: '', grade_level: '', description: '' }

function SubjectForm({ initial, onSave, onClose }) {
  const [form, setForm]     = useState(initial ?? BLANK)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))
      if (initial?.id) {
        const { data } = await api.patch(`/api/subjects/${initial.id}`, payload)
        onSave(data, 'updated')
      } else {
        const { data } = await api.post('/api/subjects', payload)
        onSave(data, 'created')
      }
    } catch (err) {
      setErrors(err.response?.data?.errors ?? { _: err.response?.data?.message ?? 'Failed.' })
    } finally {
      setSaving(false)
    }
  }

  const F = ({ label, k, opt = false }) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}{opt && <span className="text-slate-400 font-normal ml-1">(optional)</span>}
      </label>
      <input value={form[k]} onChange={set(k)} required={!opt}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors[k] ? 'border-red-400' : 'border-slate-200'}`} />
      {errors[k] && <p className="text-xs text-red-500 mt-1">{errors[k][0]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <div className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <F label="Subject name" k="name" />
          <F label="Code" k="code" opt />
        </div>
        <F label="Grade / Level" k="grade_level" />
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Description <span className="text-slate-400 font-normal">(optional)</span></label>
          <textarea value={form.description} onChange={set('description')} rows={3}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
        </div>
        {errors._ && <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{errors._}</div>}
      </div>
      <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
          {saving ? 'Saving...' : initial?.id ? 'Save changes' : 'Add subject'}
        </button>
      </div>
    </form>
  )
}

export default function SubjectsPage() {
  const toast = useToast()
  const [subjects, setSubjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [gradeFilter, setGradeFilter] = useState('')
  const [modal, setModal]         = useState(null)
  const [grades, setGrades]       = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)

  const fetch = useCallback(() => {
    setLoading(true)
    const params = gradeFilter ? { grade_level: gradeFilter } : {}
    api.get('/api/subjects', { params })
      .then(r => {
        const list = r.data?.data ?? r.data
        setSubjects(list)
        setGrades([...new Set(list.map(s => s.grade_level).filter(Boolean))].sort())
      })
      .catch(() => toast.error('Failed to load subjects.'))
      .finally(() => setLoading(false))
  }, [gradeFilter])

  useEffect(() => { fetch() }, [fetch])

  const handleSaved = (_, mode) => {
    setModal(null)
    toast.success(`Subject ${mode}.`)
    fetch()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/subjects/${deleteTarget.id}`)
      toast.success('Subject deleted.')
      setDeleteTarget(null)
      fetch()
    } catch { } finally { setDeleting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All grade levels</option>
          {grades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Subject
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        {loading ? (
          <div className="p-8 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />)}</div>
        ) : subjects.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No subjects found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Grade Level</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => (
                <tr key={s.id} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.code ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.grade_level}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{s.description ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setModal(s)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeleteTarget(s)} className="p-1.5 text-slate-400 hover:text-red-600 rounded transition">
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
        <Modal title={modal === 'add' ? 'Add Subject' : 'Edit Subject'}
          onClose={() => setModal(null)}>
          <SubjectForm initial={modal === 'add' ? null : modal} onSave={handleSaved} onClose={() => setModal(null)} />
        </Modal>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        message="This will remove the subject and any linked assessments and grades."
        confirmLabel="Delete subject"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
