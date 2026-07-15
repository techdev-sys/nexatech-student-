import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'

const CURRENCIES = ['USD', 'ZAR', 'ZiG']
const BLANK_FEE  = { title: '', academic_year: String(new Date().getFullYear()), term: '1', amount: '', currency: 'USD', class_id: '' }
const BLANK_GEN  = { fee_structure_id: '', student_ids: [], due_date: '', select_all: false }

function fmt(n, curr = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(Number(n ?? 0))
}

function FeeForm({ initial, classes, onSave, onClose }) {
  const [form, setForm]     = useState(initial ?? BLANK_FEE)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const payload = { ...form, term: Number(form.term), amount: Number(form.amount), class_id: form.class_id || null }
      if (initial?.id) {
        const { data } = await api.patch(`/api/fee-structures/${initial.id}`, payload)
        onSave(data, 'updated')
      } else {
        const { data } = await api.post('/api/fee-structures', payload)
        onSave(data, 'created')
      }
    } catch (err) {
      setErrors(err.response?.data?.errors ?? { _: err.response?.data?.message ?? 'Failed.' })
    } finally {
      setSaving(false)
    }
  }

  const F = ({ label, k, type = 'text', opt = false, children }) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}{opt && <span className="text-slate-400 font-normal ml-1">(optional)</span>}</label>
      {children ?? (
        <input type={type} value={form[k]} onChange={set(k)} required={!opt}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors[k] ? 'border-red-400' : 'border-slate-200'}`} />
      )}
      {errors[k] && <p className="text-xs text-red-500 mt-1">{errors[k][0]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <div className="px-6 py-5 space-y-4">
        <F label="Title" k="title">
          <input value={form.title} onChange={set('title')} required placeholder="Term 1 Tuition 2026"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </F>
        <div className="grid grid-cols-3 gap-3">
          <F label="Term" k="term">
            <select value={form.term} onChange={set('term')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </F>
          <F label="Academic year" k="academic_year">
            <input type="number" value={form.academic_year} onChange={set('academic_year')} min={2020} max={2099}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </F>
          <F label="Class" k="class_id" opt>
            <select value={form.class_id} onChange={set('class_id')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Amount" k="amount">
            <input type="number" step="0.01" min="0.01" value={form.amount} onChange={set('amount')} required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </F>
          <F label="Currency" k="currency">
            <select value={form.currency} onChange={set('currency')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </F>
        </div>
        {errors._ && <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{errors._}</div>}
      </div>
      <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
          {saving ? 'Saving...' : initial?.id ? 'Save changes' : 'Create fee structure'}
        </button>
      </div>
    </form>
  )
}

function GenerateModal({ feeStructures, onClose, onGenerated }) {
  const toast = useToast()
  const [form, setForm]     = useState({ fee_structure_id: '', due_date: '', grade_level: '' })
  const [students, setStudents] = useState([])
  const [selected, setSelected] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadStudents = useCallback(() => {
    if (!form.grade_level) return
    setLoadingStudents(true)
    api.get('/api/students', { params: { grade_level: form.grade_level, status: 'active', per_page: 500 } })
      .then(r => { const list = r.data?.data ?? r.data; setStudents(list); setSelected(list.map(s => s.id)) })
      .finally(() => setLoadingStudents(false))
  }, [form.grade_level])

  const toggleStudent = id => setSelected(prev =>
    prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
  )

  const handleSubmit = async e => {
    e.preventDefault()
    if (!selected.length) { toast.error('Select at least one student.'); return }
    setSaving(true)
    try {
      await api.post('/api/invoices/generate', {
        fee_structure_id: Number(form.fee_structure_id),
        student_ids:      selected,
        due_date:         form.due_date,
      })
      toast.success(`${selected.length} invoices generated.`)
      onGenerated()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to generate invoices.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Generate Invoices" subtitle="Bulk-create invoices for a fee structure" onClose={onClose} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit}>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fee structure</label>
            <select value={form.fee_structure_id} onChange={e => setForm(f => ({ ...f, fee_structure_id: e.target.value }))} required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Select</option>
              {feeStructures.map(f => <option key={f.id} value={f.id}>{f.title} ({f.currency} {f.amount})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Filter by grade level</label>
              <div className="flex gap-2">
                <input value={form.grade_level} onChange={e => setForm(f => ({ ...f, grade_level: e.target.value }))} placeholder="Form 3"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <button type="button" onClick={loadStudents} disabled={!form.grade_level || loadingStudents}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition disabled:opacity-50">
                  {loadingStudents ? '...' : 'Load'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Due date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          {students.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-600">{selected.length}/{students.length} selected</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelected(students.map(s => s.id))} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Select all</button>
                  <button type="button" onClick={() => setSelected([])} className="text-xs text-slate-500 hover:text-slate-700">Clear</button>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {students.map(s => (
                  <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleStudent(s.id)} className="w-4 h-4 accent-indigo-600" />
                    <span className="text-sm text-slate-700">{s.first_name} {s.last_name}</span>
                    <span className="text-xs text-slate-400 ml-auto">{s.student_number}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
          <button type="submit" disabled={saving || !selected.length}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
            {saving ? 'Generating...' : `Generate ${selected.length || ''} invoices`}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function FeeStructuresPage({ onNavigate }) {
  const toast = useToast()
  const [fees, setFees]         = useState([])
  const [classes, setClasses]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [showGenerate, setShowGenerate] = useState(false)

  useEffect(() => {
    api.get('/api/v1/classes').then(r => setClasses(r.data))
  }, [])

  const fetch = useCallback(() => {
    setLoading(true)
    api.get('/api/fee-structures')
      .then(r => setFees(r.data?.data ?? r.data))
      .catch(() => toast.error('Failed to load fee structures.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleDelete = async f => {
    if (!confirm(`Delete fee structure "${f.title}"?`)) return
    try { await api.delete(`/api/fee-structures/${f.id}`); toast.success('Deleted.'); fetch() }
    catch { toast.error('Failed to delete fee structure.') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGenerate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition">
            Generate Invoices
          </button>
          <button onClick={() => onNavigate?.('billing')}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium px-3 py-2">
            View all invoices
          </button>
        </div>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Fee Structure
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        {loading ? (
          <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />)}</div>
        ) : fees.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No fee structure records available.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Term</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Year</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Class</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {fees.map((f, i) => (
                <tr key={f.id} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{f.title}</td>
                  <td className="px-4 py-3 text-center text-slate-500">T{f.term}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{f.academic_year}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-700">{fmt(f.amount, f.currency)}</td>
                  <td className="px-4 py-3 text-slate-500">{f.school_class?.name ?? 'All classes'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setModal(f)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(f)} className="p-1.5 text-slate-400 hover:text-red-600 rounded transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
        <Modal title={modal === 'add' ? 'New Fee Structure' : 'Edit Fee Structure'}
          onClose={() => setModal(null)} maxWidth="max-w-lg">
          <FeeForm
            initial={modal === 'add' ? null : modal}
            classes={classes}
            onSave={(_, mode) => { setModal(null); toast.success(`Fee structure ${mode}.`); fetch() }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {showGenerate && (
        <GenerateModal
          feeStructures={fees}
          onClose={() => setShowGenerate(false)}
          onGenerated={() => { setShowGenerate(false); onNavigate?.('billing') }}
        />
      )}
    </div>
  )
}
