import { useState, useEffect, useCallback, useRef } from 'react'
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

const STATUS_BADGE = {
  recorded:  'bg-slate-100 text-slate-600',
  reviewed:  'bg-blue-50 text-blue-700',
  resolved:  'bg-emerald-50 text-emerald-700',
  escalated: 'bg-red-50 text-red-700',
}

function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Edit/Review Modal ─────────────────────────────────────────────────────────

function EditIncidentModal({ incident, onClose, onSaved }) {
  const [form, setForm] = useState({
    points:       String(incident.points),
    description:  incident.description ?? '',
    action_taken: incident.action_taken ?? '',
    status:       incident.status,
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      await api.patch(`/api/behaviour/incidents/${incident.id}`, {
        points:       Number(form.points),
        description:  form.description || undefined,
        action_taken: form.action_taken || undefined,
        status:       form.status,
      })
      onSaved()
    } catch (err) {
      setErrors(err.response?.data?.errors ?? {})
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Edit Incident" subtitle={`${incident.student?.first_name} ${incident.student?.last_name} · ${incident.incidentType?.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Points</label>
              <input type="number" value={form.points} onChange={set('points')} required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={set('status')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="recorded">Recorded</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
                <option value="escalated">Escalated</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea value={form.description} onChange={set('description')} rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Action Taken</label>
            <textarea value={form.action_taken} onChange={set('action_taken')} rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── View Modal ────────────────────────────────────────────────────────────────

function ViewModal({ incident, onClose }) {
  const Row = ({ label, children }) => (
    <div className="flex gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 w-32 shrink-0">{label}</span>
      <span className="text-sm text-slate-800 font-medium">{children}</span>
    </div>
  )
  return (
    <Modal title="Incident Details" onClose={onClose}>
      <div className="px-6 py-5 space-y-1 overflow-y-auto max-h-[70vh]">
        <Row label="Student">{incident.student?.first_name} {incident.student?.last_name}</Row>
        <Row label="Incident Type">{incident.incidentType?.name ?? '—'}</Row>
        <Row label="Category">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CAT_BADGE[incident.incidentType?.category] ?? 'bg-slate-100 text-slate-600'}`}>
            {incident.incidentType?.category}
          </span>
        </Row>
        <Row label="Severity">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${SEV_BADGE[incident.incidentType?.severity] ?? 'bg-slate-100 text-slate-600'}`}>
            {incident.incidentType?.severity}
          </span>
        </Row>
        <Row label="Points">
          <span className={`font-bold ${incident.points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {incident.points >= 0 ? `+${incident.points}` : incident.points}
          </span>
        </Row>
        <Row label="Date">{fmtDate(incident.incident_date)}</Row>
        <Row label="Status">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[incident.status]}`}>
            {incident.status}
          </span>
        </Row>
        <Row label="Reported By">{incident.reportedBy?.name ?? '—'}</Row>
        <Row label="Description">{incident.description || <span className="text-slate-400">—</span>}</Row>
        <Row label="Action Taken">{incident.action_taken || <span className="text-slate-400">—</span>}</Row>
        <Row label="Parent Notified">{incident.parent_notified_at ? fmtDate(incident.parent_notified_at) : <span className="text-slate-400">No</span>}</Row>
        <Row label="Term">{incident.term || <span className="text-slate-400">—</span>}</Row>
        <Row label="Academic Year">{incident.academic_year || <span className="text-slate-400">—</span>}</Row>
      </div>
    </Modal>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BehaviourIncidentsPage() {
  const { can } = usePermissions()
  const toast = useToast()
  const isAdmin = can('manage_behaviour')

  const [incidents, setIncidents] = useState([])
  const [meta, setMeta]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(1)

  const [search, setSearch]         = useState('')
  const [debounced, setDebounced]   = useState('')
  const [catFilter, setCat]         = useState('')
  const [sevFilter, setSev]         = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [fromDate, setFrom]         = useState('')
  const [toDate, setTo]             = useState('')

  const [viewTarget, setViewTarget]     = useState(null)
  const [editTarget, setEditTarget]     = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)

  const debRef = useRef(null)
  const handleSearch = v => {
    setSearch(v)
    clearTimeout(debRef.current)
    debRef.current = setTimeout(() => { setDebounced(v); setPage(1) }, 350)
  }

  const fetchIncidents = useCallback(() => {
    setLoading(true)
    const params = { page, per_page: 20 }
    if (debounced)     params.search       = debounced
    if (catFilter)     params.category     = catFilter
    if (sevFilter)     params.severity     = sevFilter
    if (statusFilter)  params.status       = statusFilter
    if (fromDate)      params.from_date    = fromDate
    if (toDate)        params.to_date      = toDate
    api.get('/api/behaviour/incidents', { params })
      .then(r => { setIncidents(r.data.data); setMeta(r.data.meta) })
      .catch(() => toast.error('Failed to load incidents.'))
      .finally(() => setLoading(false))
  }, [page, debounced, catFilter, sevFilter, statusFilter, fromDate, toDate])

  useEffect(() => { fetchIncidents() }, [fetchIncidents])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/behaviour/incidents/${deleteTarget.id}`)
      toast.success('Incident deleted.')
      setDeleteTarget(null)
      fetchIncidents()
    } catch {}
    finally { setDeleting(false) }
  }

  const handleSaved = () => { setEditTarget(null); toast.success('Incident updated.'); fetchIncidents() }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" placeholder="Search student" value={search} onChange={e => handleSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44" />
        <select value={catFilter} onChange={e => { setCat(e.target.value); setPage(1) }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All categories</option>
          <option value="positive">Positive</option>
          <option value="negative">Negative</option>
          <option value="neutral">Neutral</option>
        </select>
        <select value={sevFilter} onChange={e => { setSev(e.target.value); setPage(1) }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All statuses</option>
          <option value="recorded">Recorded</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
        </select>
        <input type="date" value={fromDate} onChange={e => { setFrom(e.target.value); setPage(1) }} title="From date"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36" />
        <input type="date" value={toDate} onChange={e => { setTo(e.target.value); setPage(1) }} title="To date"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        {loading ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Student','Type','Cat','Severity','Pts','Date','Reported By','Status','Notified',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody><SkeletonTableRows cols={10} rows={8} /></tbody>
          </table>
        ) : incidents.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No incidents found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Student','Incident Type','Category','Severity','Points','Date','Reported By','Status','Notified',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc, i) => (
                <tr key={inc.id} className={`border-b border-slate-100 last:border-0 hover:bg-indigo-50/30 transition cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                  onClick={() => setViewTarget(inc)}>
                  <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                    {inc.student?.first_name} {inc.student?.last_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{inc.incidentType?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CAT_BADGE[inc.incidentType?.category] ?? 'bg-slate-100 text-slate-600'}`}>
                      {inc.incidentType?.category ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${SEV_BADGE[inc.incidentType?.severity] ?? 'bg-slate-100 text-slate-600'}`}>
                      {inc.incidentType?.severity ?? '—'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-mono font-semibold ${inc.points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {inc.points >= 0 ? `+${inc.points}` : inc.points}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(inc.incident_date)}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{inc.reportedBy?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[inc.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {inc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {inc.parent_notified_at
                      ? <span className="text-emerald-600 text-xs font-semibold uppercase">Sent</span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-end">
                      {can('record_behaviour_incident') && (
                        <button onClick={() => setEditTarget(inc)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => setDeleteTarget(inc)} className="p-1.5 text-slate-400 hover:text-red-600 rounded transition" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Showing {meta.from}–{meta.to} of {meta.total}</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition text-xs">← Prev</button>
            <span className="px-3 py-1.5 text-xs">Page {page} of {meta.last_page}</span>
            <button disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition text-xs">Next</button>
          </div>
        </div>
      )}

      {viewTarget  && <ViewModal incident={viewTarget} onClose={() => setViewTarget(null)} />}
      {editTarget  && <EditIncidentModal incident={editTarget} onClose={() => setEditTarget(null)} onSaved={handleSaved} />}
      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete this incident?`}
        message="The incident will be soft-deleted and can be restored by an admin."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
