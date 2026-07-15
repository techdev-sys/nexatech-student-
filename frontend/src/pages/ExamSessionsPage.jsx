import { useState, useEffect } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'

const STATUS_COLORS = {
  draft:     'bg-slate-100 text-slate-600',
  active:    'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  archived:  'bg-amber-100 text-amber-700',
}

const BLANK = {
  name: '', academic_year: String(new Date().getFullYear()),
  term: '1', start_date: '', end_date: '', status: 'draft', description: '',
}

function SessionForm({ initial, onSave, onClose }) {
  const [form, setForm]     = useState(initial ? { ...BLANK, ...initial } : BLANK)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const payload = { ...form, term: Number(form.term) }
      if (initial?.id) {
        const { data } = await api.patch(`/api/exams/sessions/${initial.id}`, payload)
        onSave(data, 'updated')
      } else {
        const { data } = await api.post('/api/exams/sessions', payload)
        onSave(data, 'created')
      }
    } catch (err) {
      setErrors(err.response?.data?.errors ?? {})
    } finally {
      setSaving(false)
    }
  }

  const field = (label, key, type = 'text', props = {}) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input type={type} value={form[key]} onChange={set(key)}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors[key] ? 'border-red-400' : 'border-slate-200'}`}
        {...props} />
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key][0]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <div className="px-6 py-5 space-y-4">
        {field('Session Name', 'name', 'text', { required: true, placeholder: 'e.g. End of Term 1 Exams 2026' })}
        <div className="grid grid-cols-3 gap-3">
          {field('Academic Year', 'academic_year', 'text', { required: true, placeholder: '2026' })}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Term</label>
            <select value={form.term} onChange={set('term')} required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select value={form.status} onChange={set('status')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field('Start Date', 'start_date', 'date', { required: true })}
          {field('End Date', 'end_date', 'date', { required: true })}
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
          <textarea value={form.description} onChange={set('description')} rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
      </div>
      <div className="px-6 pb-5 flex justify-end gap-2">
        <button type="button" onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Saving...' : initial?.id ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  )
}

export default function ExamSessionsPage() {
  const { show: toast } = useToast()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [delTarget, setDelTarget] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/api/exams/sessions').then(r => setSessions(r.data)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSave = (session, verb) => {
    setSessions(prev => verb === 'created'
      ? [session, ...prev]
      : prev.map(s => s.id === session.id ? session : s))
    toast(`Exam session ${verb}.`, 'success')
    setModal(null)
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/api/exams/sessions/${delTarget.id}`)
      setSessions(prev => prev.filter(s => s.id !== delTarget.id))
      toast('Session deleted.', 'success')
    } finally {
      setDelTarget(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Exam Sessions</h2>
          <p className="text-sm text-slate-500">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal('create')}
          className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
          + New Session
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl" />
        ))}</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">No exam session records available.</div>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[s.status] ?? 'bg-slate-100'}`}>
                  {s.status}
                </span>
                <div>
                  <p className="font-medium text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-500">Term {s.term} · {s.academic_year} · {s.start_date} — {s.end_date}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setModal(s)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Edit</button>
                <button onClick={() => setDelTarget(s)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'New Exam Session' : 'Edit Exam Session'}
          onClose={() => setModal(null)}>
          <SessionForm initial={modal === 'create' ? null : modal}
            onSave={handleSave} onClose={() => setModal(null)} />
        </Modal>
      )}

      {delTarget && (
        <ConfirmModal title="Delete Exam Session"
          message={`Delete "${delTarget.name}"? This cannot be undone.`}
          onConfirm={handleDelete} onCancel={() => setDelTarget(null)} />
      )}
    </div>
  )
}
