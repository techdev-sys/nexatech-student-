import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'

const BLANK_SYSTEM = { name: '', is_default: false, boundaries: [] }
const BLANK_BOUNDARY = { letter_grade: '', label: '', min_score: '', max_score: '', is_pass: true, points: '' }

function BoundaryRow({ b, onChange, onDelete, saving }) {
  const set = k => e => onChange({ ...b, [k]: e.target.value })
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-2 py-2">
        <input value={b.letter_grade} onChange={set('letter_grade')} placeholder="A"
          className="w-12 border border-slate-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-400" />
      </td>
      <td className="px-2 py-2">
        <input value={b.label} onChange={set('label')} placeholder="Distinction"
          className="w-28 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
      </td>
      <td className="px-2 py-2">
        <input type="number" value={b.min_score} onChange={set('min_score')} placeholder="80"
          className="w-16 border border-slate-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-400" />
      </td>
      <td className="px-2 py-2">
        <input type="number" value={b.max_score} onChange={set('max_score')} placeholder="100"
          className="w-16 border border-slate-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-400" />
      </td>
      <td className="px-2 py-2 text-center">
        <input type="checkbox" checked={b.is_pass} onChange={e => onChange({ ...b, is_pass: e.target.checked })}
          className="w-4 h-4 accent-indigo-600" />
      </td>
      <td className="px-2 py-2">
        <input type="number" step="0.1" value={b.points} onChange={set('points')} placeholder="4.0"
          className="w-14 border border-slate-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-400" />
      </td>
      {!saving && (
        <td className="px-2 py-2">
          <button onClick={onDelete} className="text-slate-300 hover:text-red-500 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </td>
      )}
    </tr>
  )
}

function GradingSystemForm({ initial, onSave, onClose }) {
  const [name, setName]             = useState(initial?.name ?? '')
  const [isDefault, setIsDefault]   = useState(initial?.is_default ?? false)
  const [boundaries, setBoundaries] = useState(
    initial?.boundaries?.map(b => ({ ...b, points: b.points ?? '' })) ?? []
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const addRow   = () => setBoundaries(b => [...b, { ...BLANK_BOUNDARY }])
  const delRow   = i => setBoundaries(b => b.filter((_, idx) => idx !== i))
  const updateRow = (i, val) => setBoundaries(b => b.map((row, idx) => idx === i ? val : row))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        name,
        is_default: isDefault,
        boundaries: boundaries.map(b => ({
          letter_grade: b.letter_grade,
          label:        b.label,
          min_score:    Number(b.min_score),
          max_score:    Number(b.max_score),
          is_pass:      b.is_pass,
          points:       b.points !== '' ? Number(b.points) : null,
        })),
      }
      if (initial?.id) {
        const { data } = await api.patch(`/api/grading-systems/${initial.id}`, { name, is_default: isDefault })
        onSave(data, 'updated')
      } else {
        const { data } = await api.post('/api/grading-systems', payload)
        onSave(data, 'created')
      }
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[65vh]">
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">System name</label>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="National grading scale"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <input type="checkbox" id="isDefault" checked={isDefault} onChange={e => setIsDefault(e.target.checked)}
              className="w-4 h-4 accent-indigo-600" />
            <label htmlFor="isDefault" className="text-sm text-slate-700">Set as default</label>
          </div>
        </div>

        {!initial?.id && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Grade boundaries</p>
              <button type="button" onClick={addRow}
                className="text-xs px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium transition">
                + Add row
              </button>
            </div>
            {boundaries.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Letter</th>
                      <th className="px-2 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Label</th>
                      <th className="px-2 py-2 text-right font-semibold text-slate-500 uppercase tracking-wide">Min%</th>
                      <th className="px-2 py-2 text-right font-semibold text-slate-500 uppercase tracking-wide">Max%</th>
                      <th className="px-2 py-2 text-center font-semibold text-slate-500 uppercase tracking-wide">Pass</th>
                      <th className="px-2 py-2 text-right font-semibold text-slate-500 uppercase tracking-wide">Points</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {boundaries.map((b, i) => (
                      <BoundaryRow key={i} b={b} onChange={v => updateRow(i, v)} onDelete={() => delRow(i)} saving={saving} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {boundaries.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No grading boundaries configured. Add a boundary row to continue.</p>
            )}
          </>
        )}

        {error && <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}
      </div>
      <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
          {saving ? 'Saving...' : initial?.id ? 'Save changes' : 'Create system'}
        </button>
      </div>
    </form>
  )
}

function BoundaryEditor({ system, onUpdated }) {
  const toast = useToast()
  const [boundaries, setBoundaries] = useState(system.boundaries ?? [])
  const [editBid, setEditBid]       = useState(null)
  const [draft, setDraft]           = useState(null)
  const [saving, setSaving]         = useState(false)
  const [adding, setAdding]         = useState(false)
  const [newRow, setNewRow]         = useState({ ...BLANK_BOUNDARY })

  const saveEdit = async () => {
    if (!editBid) return
    setSaving(true)
    try {
      const payload = { ...draft, min_score: Number(draft.min_score), max_score: Number(draft.max_score), points: draft.points !== '' ? Number(draft.points) : null }
      await api.put(`/api/grading-systems/${system.id}/boundaries/${editBid}`, payload)
      setBoundaries(prev => prev.map(b => b.id === editBid ? { ...b, ...payload } : b))
      setEditBid(null)
      toast.success('Boundary updated.')
      onUpdated()
    } catch {
      toast.error('Failed to update boundary.')
    } finally {
      setSaving(false)
    }
  }

  const deleteBoundary = async id => {
    if (!confirm('Delete this boundary?')) return
    try {
      await api.delete(`/api/grading-systems/${system.id}/boundaries/${id}`)
      setBoundaries(prev => prev.filter(b => b.id !== id))
      toast.success('Boundary deleted.')
      onUpdated()
    } catch {
      toast.error('Failed to delete boundary.')
    }
  }

  const addBoundary = async () => {
    setSaving(true)
    try {
      const payload = { ...newRow, min_score: Number(newRow.min_score), max_score: Number(newRow.max_score), points: newRow.points !== '' ? Number(newRow.points) : null }
      const { data } = await api.post(`/api/grading-systems/${system.id}/boundaries`, payload)
      setBoundaries(prev => [...prev, data])
      setNewRow({ ...BLANK_BOUNDARY })
      setAdding(false)
      toast.success('Boundary added.')
      onUpdated()
    } catch {
      toast.error('Failed to add boundary.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 mt-3">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Letter</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Label</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wide">Min%</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wide">Max%</th>
            <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase tracking-wide">Pass</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wide">Points</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {boundaries.map(b => (
            <tr key={b.id} className="border-b border-slate-100 last:border-0">
              {editBid === b.id ? (
                <>
                  <td className="px-2 py-2"><input value={draft.letter_grade} onChange={e => setDraft(d => ({ ...d, letter_grade: e.target.value }))} className="w-10 border border-indigo-300 rounded px-1 py-0.5 text-xs text-center" /></td>
                  <td className="px-2 py-2"><input value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} className="w-24 border border-indigo-300 rounded px-1 py-0.5 text-xs" /></td>
                  <td className="px-2 py-2"><input type="number" value={draft.min_score} onChange={e => setDraft(d => ({ ...d, min_score: e.target.value }))} className="w-14 border border-indigo-300 rounded px-1 py-0.5 text-xs text-right" /></td>
                  <td className="px-2 py-2"><input type="number" value={draft.max_score} onChange={e => setDraft(d => ({ ...d, max_score: e.target.value }))} className="w-14 border border-indigo-300 rounded px-1 py-0.5 text-xs text-right" /></td>
                  <td className="px-2 py-2 text-center"><input type="checkbox" checked={draft.is_pass} onChange={e => setDraft(d => ({ ...d, is_pass: e.target.checked }))} className="w-3.5 h-3.5 accent-indigo-600" /></td>
                  <td className="px-2 py-2"><input type="number" step="0.1" value={draft.points} onChange={e => setDraft(d => ({ ...d, points: e.target.value }))} className="w-12 border border-indigo-300 rounded px-1 py-0.5 text-xs text-right" /></td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <button onClick={saveEdit} disabled={saving} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded transition disabled:opacity-50">Save</button>
                      <button onClick={() => setEditBid(null)} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded transition">Cancel</button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-3 py-2 font-bold text-slate-700">{b.letter_grade}</td>
                  <td className="px-3 py-2 text-slate-600">{b.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.min_score}%</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.max_score}%</td>
                  <td className="px-3 py-2 text-center">{b.is_pass ? 'Pass' : 'Fail'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.points ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => { setEditBid(b.id); setDraft({ ...b, points: b.points ?? '' }) }}
                        className="text-slate-400 hover:text-indigo-600 transition">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => deleteBoundary(b.id)} className="text-slate-400 hover:text-red-500 transition">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
          {adding && (
            <BoundaryRow b={newRow} onChange={setNewRow} onDelete={() => setAdding(false)} saving={saving} />
          )}
        </tbody>
      </table>
      {adding ? (
        <div className="px-3 py-2 flex gap-2 border-t border-slate-100">
          <button onClick={addBoundary} disabled={saving} className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg transition disabled:opacity-50">{saving ? 'Saving...' : 'Save row'}</button>
          <button onClick={() => setAdding(false)} className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg transition">Cancel</button>
        </div>
      ) : (
        <div className="px-3 py-2 border-t border-slate-100">
          <button onClick={() => setAdding(true)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">+ Add boundary</button>
        </div>
      )}
    </div>
  )
}

export default function GradingSystemPage() {
  const toast = useToast()
  const [systems, setSystems]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [modal, setModal]       = useState(null)

  const fetch = useCallback(() => {
    setLoading(true)
    api.get('/api/grading-systems')
      .then(r => setSystems(r.data?.data ?? r.data))
      .catch(() => toast.error('Failed to load grading systems.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleDelete = async s => {
    if (!confirm(`Delete grading system "${s.name}"?`)) return
    try { await api.delete(`/api/grading-systems/${s.id}`); toast.success('Deleted.'); fetch() }
    catch { toast.error('Failed to delete grading system.') }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Grading System
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : systems.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm">No grading system records available.</div>
      ) : (
        <div className="space-y-3">
          {systems.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => setExpanded(e => e === s.id ? null : s.id)}
                    className={`text-slate-400 hover:text-indigo-600 transition ${expanded === s.id ? 'rotate-90' : ''}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                      {s.is_default && (
                        <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 rounded-full font-medium">Default</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{s.boundaries?.length ?? 0} boundaries</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setModal(s)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(s)} className="p-1.5 text-slate-400 hover:text-red-600 rounded transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              {expanded === s.id && (
                <div className="px-5 pb-5">
                  <BoundaryEditor system={s} onUpdated={fetch} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'New Grading System' : 'Edit Grading System'}
          onClose={() => setModal(null)} maxWidth="max-w-2xl">
          <GradingSystemForm
            initial={modal === 'add' ? null : modal}
            onSave={(_, mode) => { setModal(null); toast.success(`Grading system ${mode}.`); fetch() }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  )
}
