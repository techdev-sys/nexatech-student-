import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import { usePermissions } from '../hooks/usePermissions'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { SkeletonTableRows } from '../components/Skeleton'

const CH_BADGE = {
  sms:          'bg-indigo-50 text-indigo-700',
  email:        'bg-sky-50 text-sky-700',
  announcement: 'bg-purple-50 text-purple-700',
}

function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Empty({ msg }) {
  return <p className="text-sm text-slate-400 text-center py-10">{msg}</p>
}

function TemplateForm({ initial, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name:      initial?.name    ?? '',
    channel:   initial?.channel ?? 'sms',
    subject:   initial?.subject ?? '',
    body:      initial?.body    ?? '',
    is_active: initial?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [vars, setVars]     = useState(initial?.variables_json ?? [])

  const set = k => e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
    if (k === 'body') {
      const found = [...e.target.value.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1])
      setVars([...new Set(found)])
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (form.channel !== 'email') delete payload.subject
      if (initial?.id) {
        await api.patch(`/api/communications/templates/${initial.id}`, payload)
        toast.success('Template updated.')
      } else {
        await api.post('/api/communications/templates', payload)
        toast.success('Template created.')
      }
      onSaved()
    } catch {
      // interceptor handles toast
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
          <input type="text" value={form.name} onChange={set('name')} required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Channel *</label>
          <select value={form.channel} onChange={set('channel')}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="announcement">Announcement</option>
          </select>
        </div>
      </div>
      {form.channel === 'email' && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
          <input type="text" value={form.subject} onChange={set('subject')}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Body *</label>
        <textarea value={form.body} onChange={set('body')} required rows={6}
          placeholder="Use approved template variables such as {{student_name}}"
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none font-mono" />
      </div>
      {vars.length > 0 && (
        <div className="bg-amber-50 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">Detected variables</p>
          <div className="flex flex-wrap gap-2">
            {vars.map(v => (
              <span key={v} className="text-xs font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded">{'{{' + v + '}}'}</span>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_active" checked={form.is_active} onChange={set('is_active')}
          className="rounded text-indigo-600" />
        <label htmlFor="is_active" className="text-sm text-slate-700">Active (available for selection)</label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition">
          {saving ? 'Saving...' : initial?.id ? 'Save Changes' : 'Create Template'}
        </button>
      </div>
    </form>
  )
}

export default function CommunicationTemplatesPage() {
  const { can }   = usePermissions()
  const toast     = useToast()

  const [templates, setTemplates] = useState([])
  const [meta, setMeta]           = useState({})
  const [loading, setLoading]     = useState(true)
  const [filters, setFilters]     = useState({ channel: '', is_active: '' })
  const [page, setPage]           = useState(1)
  const [modal, setModal]         = useState(null)
  const [deleting, setDeleting]   = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  if (!can('manage_templates')) {
    return <div className="py-16 text-center text-slate-400 text-sm">You do not have permission to manage templates.</div>
  }

  const fetchTemplates = useCallback(() => {
    setLoading(true)
    const params = { page, per_page: 15 }
    if (filters.channel)   params.channel   = filters.channel
    if (filters.is_active) params.is_active = filters.is_active
    api.get('/api/communications/templates', { params })
      .then(r => { setTemplates(r.data.data); setMeta(r.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, filters])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const handleSaved = () => { setModal(null); fetchTemplates() }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await api.delete(`/api/communications/templates/${deleting.id}`)
      toast.success('Template deleted.')
      setDeleting(null)
      fetchTemplates()
    } catch {
      // interceptor handles toast
    } finally {
      setDeleteLoading(false)
    }
  }

  const setFilter = k => e => { setFilters(f => ({ ...f, [k]: e.target.value })); setPage(1) }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="bg-indigo-600 rounded-2xl px-6 py-4 text-white flex-1 mr-4">
          <p className="text-sm text-indigo-200 font-medium">Communication Center</p>
          <h2 className="text-lg font-bold">Message Templates</h2>
        </div>
        <button onClick={() => setModal('create')}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition shrink-0">
          + New Template
        </button>
      </div>

      <div className="flex flex-wrap gap-3 bg-slate-50 rounded-xl p-4">
        <select value={filters.channel} onChange={setFilter('channel')}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All channels</option>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
          <option value="announcement">Announcement</option>
        </select>
        <select value={filters.is_active} onChange={setFilter('is_active')}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All status</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Name', 'Channel', 'Variables', 'Status', 'Updated', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows cols={6} rows={8} />
            ) : templates.length === 0 ? (
              <tr><td colSpan={6}><Empty msg="No templates found." /></td></tr>
            ) : templates.map((t, i) => (
              <tr key={t.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CH_BADGE[t.channel] ?? 'bg-slate-100 text-slate-600'}`}>{t.channel}</span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                  {t.variables_json?.length > 0 ? t.variables_json.map(v => `{{${v}}}`).join(', ') : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtDate(t.updated_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => setModal(t)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                    <button onClick={() => setDeleting(t)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Showing {meta.from}–{meta.to} of {meta.total}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Prev</button>
            <button disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
          </div>
        </div>
      )}

      {modal && (
        <Modal
          title={modal === 'create' ? 'New Template' : 'Edit Template'}
          onClose={() => setModal(null)}
          maxWidth="max-w-2xl">
          <TemplateForm initial={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSaved={handleSaved} />
        </Modal>
      )}

      <ConfirmModal
        open={!!deleting}
        danger
        title="Delete Template?"
        message={`"${deleting?.name}" will be soft-deleted and can be restored later.`}
        confirmLabel="Delete"
        cancelLabel="Keep"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
