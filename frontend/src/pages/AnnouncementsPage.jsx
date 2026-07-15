import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import { usePermissions } from '../hooks/usePermissions'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { SkeletonTableRows } from '../components/Skeleton'

const AUDIENCE_OPTS = [
  { value: 'all',      label: 'Entire School' },
  { value: 'parents',  label: 'All Parents' },
  { value: 'teachers', label: 'All Teachers' },
  { value: 'staff',    label: 'All Staff' },
  { value: 'grade',    label: 'By Grade' },
]

function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(val) {
  if (!val) return '—'
  return new Date(val).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Convert ISO datetime to datetime-local input value (YYYY-MM-DDTHH:MM)
function toDatetimeLocal(val) {
  if (!val) return ''
  const d = new Date(val)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function announcementStatus(ann) {
  const now       = Date.now()
  const published = ann.published_at ? new Date(ann.published_at).getTime() : null
  const expires   = ann.expires_at   ? new Date(ann.expires_at).getTime()   : null
  if (published && published > now) return 'scheduled'
  if (expires   && expires   < now) return 'expired'
  return 'active'
}

const STATUS_BADGE = {
  active:    'bg-emerald-50 text-emerald-700',
  expired:   'bg-red-50 text-red-600',
  scheduled: 'bg-blue-50 text-blue-700',
}

function AudienceBadge({ type }) {
  const colors = {
    all: 'bg-slate-100 text-slate-600', parents: 'bg-sky-50 text-sky-700',
    teachers: 'bg-indigo-50 text-indigo-700', staff: 'bg-purple-50 text-purple-700',
    grade: 'bg-amber-50 text-amber-700', class: 'bg-emerald-50 text-emerald-700',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${colors[type] ?? 'bg-slate-100 text-slate-600'}`}>
      {type}
    </span>
  )
}

function Empty({ msg }) {
  return <p className="text-sm text-slate-400 text-center py-10">{msg}</p>
}

function AnnouncementForm({ initial, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    subject:       initial?.subject      ?? '',
    body:          initial?.body         ?? '',
    audience_type: initial?.audience_type ?? 'all',
    grade_level:   initial?.audience_filter_json?.grade_level ?? '',
    published_at:  toDatetimeLocal(initial?.published_at),
    expires_at:    toDatetimeLocal(initial?.expires_at),
  })
  const [saving, setSaving] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        subject:       form.subject,
        body:          form.body,
        audience_type: form.audience_type,
        ...(form.audience_type === 'grade' && form.grade_level
          ? { audience_filter: { grade_level: form.grade_level } }
          : {}),
        ...(form.published_at ? { published_at: form.published_at } : {}),
        ...(form.expires_at   ? { expires_at:   form.expires_at   } : { expires_at: null }),
      }
      if (initial?.id) {
        await api.patch(`/api/announcements/${initial.id}`, payload)
        toast.success('Announcement updated.')
      } else {
        await api.post('/api/announcements', payload)
        toast.success('Announcement published.')
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
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Subject *</label>
        <input type="text" value={form.subject} onChange={set('subject')} required
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Body *</label>
        <textarea value={form.body} onChange={set('body')} required rows={5}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Audience *</label>
        <select value={form.audience_type} onChange={set('audience_type')}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          {AUDIENCE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {form.audience_type === 'grade' && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Grade / Level *</label>
          <input type="text" value={form.grade_level} onChange={set('grade_level')} placeholder="Form 3"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Publish At</label>
          <input type="datetime-local" value={form.published_at} onChange={set('published_at')}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <p className="text-xs text-slate-400 mt-0.5">Leave blank to publish immediately</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Expires At</label>
          <input type="datetime-local" value={form.expires_at} onChange={set('expires_at')}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <p className="text-xs text-slate-400 mt-0.5">Leave blank to never expire</p>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition">
          {saving ? 'Saving...' : initial?.id ? 'Save Changes' : 'Publish'}
        </button>
      </div>
    </form>
  )
}

export default function AnnouncementsPage() {
  const { can, role } = usePermissions()
  const toast         = useToast()
  const isAdmin       = role === 'admin' || role === 'super_admin'

  const [announcements, setAnnouncements] = useState([])
  const [meta, setMeta]                   = useState({})
  const [loading, setLoading]             = useState(true)
  const [filters, setFilters]             = useState({ search: '', from_date: '', to_date: '', active_only: false })
  const [page, setPage]                   = useState(1)
  const [modal, setModal]                 = useState(null)
  const [deleting, setDeleting]           = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchAnnouncements = useCallback(() => {
    setLoading(true)
    const params = { page, per_page: 15 }
    if (filters.search)      params.search      = filters.search
    if (filters.from_date)   params.from_date   = filters.from_date
    if (filters.to_date)     params.to_date     = filters.to_date
    if (filters.active_only) params.active_only = 1
    api.get('/api/announcements', { params })
      .then(r => { setAnnouncements(r.data.data); setMeta(r.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, filters])

  useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])

  const handleSaved = () => { setModal(null); fetchAnnouncements() }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await api.delete(`/api/announcements/${deleting.id}`)
      toast.success('Announcement deleted.')
      setDeleting(null)
      fetchAnnouncements()
    } catch {
      // interceptor handles toast
    } finally {
      setDeleteLoading(false)
    }
  }

  const setFilter = k => e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFilters(f => ({ ...f, [k]: val }))
    setPage(1)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="bg-purple-600 rounded-2xl px-6 py-4 text-white flex-1 mr-4">
          <p className="text-sm text-purple-200 font-medium">Communication Center</p>
          <h2 className="text-lg font-bold">Announcements</h2>
        </div>
        {can('manage_announcements') && (
          <button onClick={() => setModal('create')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition shrink-0">
            + New Announcement
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50 rounded-xl p-4">
        <input type="text" value={filters.search} onChange={setFilter('search')} placeholder="Search"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-48" />
        <input type="date" value={filters.from_date} onChange={setFilter('from_date')}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36" />
        <input type="date" value={filters.to_date} onChange={setFilter('to_date')}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36" />
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={filters.active_only} onChange={setFilter('active_only')}
            className="rounded text-indigo-600" />
          Active only
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Subject', 'Audience', 'Status', 'Publishes', 'Expires', 'Created By', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows cols={7} rows={8} />
            ) : announcements.length === 0 ? (
              <tr><td colSpan={7}><Empty msg="No announcements found." /></td></tr>
            ) : announcements.map((a, i) => {
              const status = announcementStatus(a)
              return (
                <tr key={a.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{a.subject}</td>
                  <td className="px-4 py-3"><AudienceBadge type={a.audience_type} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDateTime(a.published_at)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDateTime(a.expires_at) || 'Never'}</td>
                  <td className="px-4 py-3 text-slate-500">{a.created_by?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {can('manage_announcements') && (
                        <button onClick={() => setModal(a)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                      )}
                      {isAdmin && (
                        <button onClick={() => setDeleting(a)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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

      {/* Create / Edit modal */}
      {modal && (
        <Modal
          title={modal === 'create' ? 'New Announcement' : 'Edit Announcement'}
          onClose={() => setModal(null)}
          maxWidth="max-w-xl">
          <AnnouncementForm
            initial={modal === 'create' ? null : modal}
            onClose={() => setModal(null)}
            onSaved={handleSaved} />
        </Modal>
      )}

      <ConfirmModal
        open={!!deleting}
        danger
        title="Delete Announcement?"
        message={`"${deleting?.subject}" will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Keep"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
