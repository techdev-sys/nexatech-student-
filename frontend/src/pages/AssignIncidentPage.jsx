import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import { usePermissions } from '../hooks/usePermissions'
import Modal from '../components/Modal'
import { SkeletonTableRows } from '../components/Skeleton'

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEV_BADGE = {
  low:      'bg-slate-100 text-slate-600',
  medium:   'bg-amber-50 text-amber-700',
  high:     'bg-orange-50 text-orange-700',
  critical: 'bg-red-50 text-red-700 ring-1 ring-red-300',
}

const CAT_BADGE = {
  positive: 'bg-emerald-50 text-emerald-700',
  negative: 'bg-red-50 text-red-700',
  neutral:  'bg-slate-100 text-slate-600',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// ── Assign Modal ──────────────────────────────────────────────────────────────

function AssignModal({ student, incidentTypes, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    incident_type_id: '',
    points: '',
    incident_date: today(),
    description: '',
    action_taken: '',
    term: '',
    academic_year: String(new Date().getFullYear()),
    status: 'recorded',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const selectedType = incidentTypes.find(t => String(t.id) === String(form.incident_type_id))

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleTypeChange = e => {
    const id = e.target.value
    const type = incidentTypes.find(t => String(t.id) === id)
    setForm(f => ({ ...f, incident_type_id: id, points: type ? String(type.default_points) : '' }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.incident_type_id) { setErrors({ incident_type_id: ['Required'] }); return }
    setSaving(true)
    setErrors({})
    try {
      const payload = {
        student_id:       student.id,
        incident_type_id: Number(form.incident_type_id),
        points:           Number(form.points),
        incident_date:    form.incident_date,
        description:      form.description || undefined,
        action_taken:     form.action_taken || undefined,
        term:             form.term || undefined,
        academic_year:    form.academic_year || undefined,
        status:           form.status,
      }
      const { data } = await api.post('/api/behaviour/incidents', payload)
      if (data.parent_notified) {
        toast.success('Incident recorded and parent notified.')
      } else {
        toast.success('Behaviour incident recorded.')
      }
      onSaved()
    } catch (err) {
      setErrors(err.response?.data?.errors ?? {})
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Assign Behaviour Incident"
      subtitle={`${student.first_name} ${student.last_name} · ${student.grade_level}${student.section ? ' ' + student.section : ''}`}
      onClose={onClose} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit}>
        <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[65vh]">
          {/* Incident type */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Incident Type *</label>
            <select value={form.incident_type_id} onChange={handleTypeChange} required
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.incident_type_id ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}>
              <option value="">Select type</option>
              {['positive', 'negative', 'neutral'].map(cat => {
                const group = incidentTypes.filter(t => t.category === cat)
                if (!group.length) return null
                return (
                  <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                    {group.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.default_points >= 0 ? `+${t.default_points}` : t.default_points} pts)
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
            {errors.incident_type_id && <p className="text-xs text-red-500 mt-1">{errors.incident_type_id[0]}</p>}
          </div>

          {/* Type info banner */}
          {selectedType && (
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CAT_BADGE[selectedType.category]}`}>
                {selectedType.category}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${SEV_BADGE[selectedType.severity]}`}>
                {selectedType.severity}
              </span>
              {selectedType.notify_parent && (
                <span className="text-xs text-orange-600 font-medium">Parent notification enabled</span>
              )}
            </div>
          )}

          {/* Points + date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Points *</label>
              <input type="number" value={form.points} onChange={set('points')} required
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.points ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
              />
              {errors.points && <p className="text-xs text-red-500 mt-1">{errors.points[0]}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
              <input type="date" value={form.incident_date} onChange={set('incident_date')} required max={today()}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Term + year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Term</label>
              <select value={form.term} onChange={set('term')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">Optional</option>
                <option>Term 1</option><option>Term 2</option><option>Term 3</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Academic Year</label>
              <input type="text" value={form.academic_year} onChange={set('academic_year')} placeholder="2026"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea value={form.description} onChange={set('description')} rows={2} placeholder="Brief description of the incident"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          {/* Action taken */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Action Taken</label>
            <textarea value={form.action_taken} onChange={set('action_taken')} rows={2} placeholder="e.g. Verbal warning issued"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          {/* Status */}
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

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center gap-2">
            {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
            {saving ? 'Saving...' : 'Record Incident'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AssignIncidentPage() {
  const { can } = usePermissions()
  const [students, setStudents] = useState([])
  const [incidentTypes, setIncidentTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState(null)
  const [assignTarget, setAssignTarget] = useState(null)

  const debounceRef = useRef(null)
  const handleSearch = v => {
    setSearch(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDebounced(v); setPage(1) }, 350)
  }

  const fetchStudents = useCallback(() => {
    setLoading(true)
    const params = { page, per_page: 20 }
    if (debouncedSearch) params.search = debouncedSearch
    if (gradeFilter)     params.grade_level = gradeFilter
    api.get('/api/students', { params })
      .then(r => { setStudents(r.data.data); setMeta(r.data.meta) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, debouncedSearch, gradeFilter])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  useEffect(() => {
    api.get('/api/behaviour/incident-types', { params: { is_active: 1, per_page: 200 } })
      .then(r => setIncidentTypes(r.data.data ?? r.data))
      .catch(() => {})
  }, [])

  if (!can('record_behaviour_incident')) {
    return <div className="py-16 text-center text-slate-400 text-sm">You do not have permission to record behaviour incidents.</div>
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input type="search" placeholder="Search student" value={search} onChange={e => handleSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-52" />
        <input type="text" placeholder="Grade level" value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setPage(1) }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        {loading ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Name','Student #','Grade','Action'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody><SkeletonTableRows cols={4} rows={8} /></tbody>
          </table>
        ) : students.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No students found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Student #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Grade</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{s.first_name} {s.last_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.student_number ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.grade_level}{s.section ? ` ${s.section}` : ''}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${s.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setAssignTarget(s)}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition">
                      Assign Incident
                    </button>
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

      {/* Assign modal */}
      {assignTarget && (
        <AssignModal
          student={assignTarget}
          incidentTypes={incidentTypes}
          onClose={() => setAssignTarget(null)}
          onSaved={() => { setAssignTarget(null); fetchStudents() }}
        />
      )}
    </div>
  )
}
