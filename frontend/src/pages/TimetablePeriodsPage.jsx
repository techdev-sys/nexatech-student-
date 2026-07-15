import { useState } from 'react'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { SkeletonTableRows } from '../components/Skeleton'
import {
  useTimetablePeriods, useCreateTimetablePeriod, useUpdateTimetablePeriod,
  useDeleteTimetablePeriod, backendMessage,
} from '../modules/timetable/hooks'

function fmtTime(t) { return t ? String(t).slice(0, 5) : '—' }

function PeriodForm({ initial, onClose, onSaved }) {
  const create = useCreateTimetablePeriod()
  const update = useUpdateTimetablePeriod()
  const [form, setForm] = useState({
    name:       initial?.name ?? '',
    starts_at:  fmtTime(initial?.starts_at) === '—' ? '' : fmtTime(initial?.starts_at),
    ends_at:    fmtTime(initial?.ends_at) === '—' ? '' : fmtTime(initial?.ends_at),
    sort_order: initial?.sort_order ?? 0,
    is_break:   initial?.is_break ?? false,
    is_active:  initial?.is_active ?? true,
  })
  const [err, setErr] = useState(null)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (ev) => {
    ev.preventDefault()
    setErr(null)
    const payload = { ...form, sort_order: Number(form.sort_order) }
    try {
      if (initial?.id) await update.mutate(initial.id, payload)
      else             await create.mutate(payload)
      onSaved()
    } catch (e) { setErr(backendMessage(e)) }
  }

  const busy = create.loading || update.loading
  return (
    <form onSubmit={submit} className="p-6 space-y-4">
      {err && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{err}</div>}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
        <input type="text" value={form.name} onChange={set('name')} required
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Starts *</label>
          <input type="time" value={form.starts_at} onChange={set('starts_at')} required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Ends *</label>
          <input type="time" value={form.ends_at} onChange={set('ends_at')} required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Sort order</label>
        <input type="number" min={0} value={form.sort_order} onChange={set('sort_order')}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.is_break} onChange={set('is_break')} className="rounded text-indigo-600" /> Break period</label>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.is_active} onChange={set('is_active')} className="rounded text-indigo-600" /> Active</label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
        <button type="submit" disabled={busy} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">{busy ? 'Saving...' : initial?.id ? 'Save' : 'Create'}</button>
      </div>
    </form>
  )
}

export default function TimetablePeriodsPage() {
  const [search, setSearch] = useState('')
  const [modal, setModal]   = useState(null)
  const [del, setDel]       = useState(null)
  const remove = useDeleteTimetablePeriod()
  const { data, loading, error, refetch } = useTimetablePeriods({ search, per_page: 100 })
  const periods = data?.data ?? data ?? []

  const onSaved = () => { setModal(null); refetch() }
  const doDelete = async () => { try { await remove.mutate(del.id) } finally { setDel(null); refetch() } }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="bg-slate-700 rounded-2xl px-6 py-4 text-white flex-1">
          <p className="text-sm text-slate-300 font-medium">Timetable</p>
          <h2 className="text-lg font-bold">Periods</h2>
        </div>
        <button onClick={() => setModal('create')} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shrink-0">+ New Period</button>
      </div>

      <div className="bg-slate-50 rounded-xl p-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search periods"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-56" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Name', 'Starts', 'Ends', 'Order', 'Type', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? <SkeletonTableRows cols={7} rows={6} />
              : error ? <tr><td colSpan={7} className="py-10 text-center text-sm text-red-600">Failed to load periods.</td></tr>
              : periods.length === 0 ? <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">No timetable periods configured.</td></tr>
              : periods.map((p, i) => (
                <tr key={p.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtTime(p.starts_at)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtTime(p.ends_at)}</td>
                  <td className="px-4 py-3 text-slate-500">{p.sort_order}</td>
                  <td className="px-4 py-3">{p.is_break ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Break</span> : <span className="text-xs text-slate-400">Lesson</span>}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => setModal(p)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit</button><button onClick={() => setDel(p)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button></div></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {modal && <Modal title={modal === 'create' ? 'New Period' : 'Edit Period'} onClose={() => setModal(null)}><PeriodForm initial={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSaved={onSaved} /></Modal>}
      <ConfirmModal open={!!del} danger title="Delete period?" message={`"${del?.name}" will be archived (soft-deleted).`} confirmLabel="Delete" loading={remove.loading} onConfirm={doDelete} onCancel={() => setDel(null)} />
    </div>
  )
}
