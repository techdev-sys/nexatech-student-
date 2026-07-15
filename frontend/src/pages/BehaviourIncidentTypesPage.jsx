import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import { usePermissions } from '../hooks/usePermissions'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { SkeletonTableRows } from '../components/Skeleton'

// ── Badge helpers ─────────────────────────────────────────────────────────────

const SEV_BADGE = {
  low:      'bg-slate-100 text-slate-600',
  medium:   'bg-amber-50 text-amber-700',
  high:     'bg-orange-50 text-orange-700',
  critical: 'bg-red-50 text-red-700 ring-1 ring-red-200',
}

const CAT_BADGE = {
  positive: 'bg-emerald-50 text-emerald-700',
  negative: 'bg-red-50 text-red-600',
  neutral:  'bg-slate-100 text-slate-600',
}

// ── Form ──────────────────────────────────────────────────────────────────────

const BLANK = {
  name: '', description: '', default_points: '', severity: 'low',
  category: 'negative', notify_parent: false, is_active: true,
}

function TypeForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ?? BLANK)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [warn, setWarn] = useState('')

  const set = k => e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
  }

  // Warn if category / points sign mismatch
  useEffect(() => {
    const pts = Number(form.default_points)
    if (!isNaN(pts)) {
      if (form.category === 'positive' && pts < 0) setWarn('Positive category usually has positive points.')
      else if (form.category === 'negative' && pts > 0) setWarn('Negative category usually has negative points.')
      else setWarn('')
    }
  }, [form.category, form.default_points])

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const payload = {
        ...form,
        default_points: Number(form.default_points),
      }
      if (initial?.id) {
        await api.patch(`/api/behaviour/incident-types/${initial.id}`, payload)
        onSave('updated')
      } else {
        await api.post('/api/behaviour/incident-types', payload)
        onSave('created')
      }
    } catch (err) {
      setErrors(err.response?.data?.errors ?? {})
    } finally {
      setSaving(false)
    }
  }

  const F = ({ label, k, type = 'text', opt = false, step }) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}{opt && <span className="text-slate-400 font-normal ml-1">(optional)</span>}
      </label>
      <input type={type} value={form[k]} onChange={set(k)} step={step}
        required={!opt}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors[k] ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
      />
      {errors[k] && <p className="text-xs text-red-500 mt-1">{errors[k][0]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[65vh]">
        <F label="Name" k="name" />
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Description<span className="text-slate-400 font-normal ml-1">(optional)</span></label>
          <textarea value={form.description} onChange={set('description')} rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
            <select value={form.category} onChange={set('category')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Severity</label>
            <select value={form.severity} onChange={set('severity')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <F label="Default Points" k="default_points" type="number" step="1" />

        {warn && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {warn}
          </div>
        )}

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.notify_parent} onChange={set('notify_parent')}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400" />
            <span className="text-sm text-slate-700">Notify parent automatically</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={set('is_active')}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400" />
            <span className="text-sm text-slate-700">Active</span>
          </label>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
          {saving ? 'Saving...' : initial?.id ? 'Save changes' : 'Create type'}
        </button>
      </div>
    </form>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BehaviourIncidentTypesPage() {
  const { can } = usePermissions()
  const toast = useToast()
  const isAdmin = can('manage_behaviour')

  const [types, setTypes]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [modalMode, setModalMode]   = useState(null) // 'add' | 'edit'
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]     = useState(false)

  const fetchTypes = useCallback(() => {
    setLoading(true)
    api.get('/api/behaviour/incident-types', { params: { per_page: 200 } })
      .then(r => setTypes(r.data.data ?? r.data))
      .catch(() => toast.error('Failed to load incident types.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchTypes() }, [fetchTypes])

  const handleSaved = mode => {
    setModalMode(null)
    setEditTarget(null)
    toast.success(`Incident type ${mode}.`)
    fetchTypes()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/behaviour/incident-types/${deleteTarget.id}`)
      toast.success('Incident type deleted.')
      setDeleteTarget(null)
      fetchTypes()
    } catch {}
    finally { setDeleting(false) }
  }

  if (!can('view_behaviour')) {
    return <div className="py-16 text-center text-slate-400 text-sm">You do not have permission to view behaviour settings.</div>
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">Define the behaviour rules available for your school.</p>
        {isAdmin && (
          <button onClick={() => setModalMode('add')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Type
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        {loading ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Name','Category','Default Points','Severity','Notify Parent','Active',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody><SkeletonTableRows cols={7} rows={6} /></tbody>
          </table>
        ) : types.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No incident types configured.
            {isAdmin && <> Click <strong>Add Type</strong> to create your first one.</>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Name', 'Category', 'Default Points', 'Severity', 'Notify Parent', 'Active', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {types.map((t, i) => (
                <tr key={t.id} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <div>{t.name}</div>
                    {t.description && <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{t.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CAT_BADGE[t.category] ?? 'bg-slate-100 text-slate-600'}`}>
                      {t.category}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-mono font-semibold ${t.default_points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.default_points >= 0 ? `+${t.default_points}` : t.default_points}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${SEV_BADGE[t.severity] ?? 'bg-slate-100 text-slate-600'}`}>
                      {t.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.notify_parent
                      ? <span className="text-orange-600 text-xs font-medium">Yes</span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.is_active
                      ? <span className="text-emerald-600 text-xs font-medium">Active</span>
                      : <span className="text-slate-400 text-xs">Inactive</span>}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && (
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => { setEditTarget(t); setModalMode('edit') }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => setDeleteTarget(t)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded transition" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(modalMode === 'add' || modalMode === 'edit') && (
        <Modal
          title={modalMode === 'add' ? 'Add Incident Type' : 'Edit Incident Type'}
          onClose={() => { setModalMode(null); setEditTarget(null) }}
        >
          <TypeForm
            initial={editTarget}
            onSave={handleSaved}
            onClose={() => { setModalMode(null); setEditTarget(null) }}
          />
        </Modal>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        message="Existing incidents using this type will be unaffected. The type will be soft-deleted."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
