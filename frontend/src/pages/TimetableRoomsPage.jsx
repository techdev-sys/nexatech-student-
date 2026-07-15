import { useState } from 'react'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { SkeletonTableRows } from '../components/Skeleton'
import {
  useTimetableRooms, useCreateTimetableRoom, useUpdateTimetableRoom,
  useDeleteTimetableRoom, backendMessage,
} from '../modules/timetable/hooks'

function RoomForm({ initial, onClose, onSaved }) {
  const create = useCreateTimetableRoom()
  const update = useUpdateTimetableRoom()
  const [form, setForm] = useState({
    name:      initial?.name ?? '',
    code:      initial?.code ?? '',
    capacity:  initial?.capacity ?? '',
    room_type: initial?.room_type ?? '',
    is_active: initial?.is_active ?? true,
  })
  const [err, setErr] = useState(null)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (ev) => {
    ev.preventDefault()
    setErr(null)
    const payload = { ...form, capacity: form.capacity ? Number(form.capacity) : null, code: form.code || null, room_type: form.room_type || null }
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
        <input type="text" value={form.name} onChange={set('name')} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
          <input type="text" value={form.code} onChange={set('code')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Capacity</label>
          <input type="number" min={1} value={form.capacity} onChange={set('capacity')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Room type</label>
        <input type="text" value={form.room_type} onChange={set('room_type')} placeholder="Classroom, laboratory, hall" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.is_active} onChange={set('is_active')} className="rounded text-indigo-600" /> Active</label>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
        <button type="submit" disabled={busy} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">{busy ? 'Saving...' : initial?.id ? 'Save' : 'Create'}</button>
      </div>
    </form>
  )
}

export default function TimetableRoomsPage() {
  const [search, setSearch]     = useState('')
  const [roomType, setRoomType] = useState('')
  const [modal, setModal]       = useState(null)
  const [del, setDel]           = useState(null)
  const remove = useDeleteTimetableRoom()
  const { data, loading, error, refetch } = useTimetableRooms({ search, room_type: roomType, per_page: 100 })
  const rooms = data?.data ?? data ?? []

  const onSaved = () => { setModal(null); refetch() }
  const doDelete = async () => { try { await remove.mutate(del.id) } finally { setDel(null); refetch() } }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="bg-slate-700 rounded-2xl px-6 py-4 text-white flex-1">
          <p className="text-sm text-slate-300 font-medium">Timetable</p>
          <h2 className="text-lg font-bold">Rooms</h2>
        </div>
        <button onClick={() => setModal('create')} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shrink-0">+ New Room</button>
      </div>

      <div className="flex flex-wrap gap-3 bg-slate-50 rounded-xl p-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rooms" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-56" />
        <input type="text" value={roomType} onChange={e => setRoomType(e.target.value)} placeholder="Filter by type" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Name', 'Code', 'Type', 'Capacity', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? <SkeletonTableRows cols={6} rows={6} />
              : error ? <tr><td colSpan={6} className="py-10 text-center text-sm text-red-600">Failed to load rooms.</td></tr>
              : rooms.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">No room records configured.</td></tr>
              : rooms.map((r, i) => (
                <tr key={r.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                  <td className="px-4 py-3 text-slate-500">{r.code ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{r.room_type ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{r.capacity ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${r.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{r.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => setModal(r)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit</button><button onClick={() => setDel(r)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button></div></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {modal && <Modal title={modal === 'create' ? 'New Room' : 'Edit Room'} onClose={() => setModal(null)}><RoomForm initial={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSaved={onSaved} /></Modal>}
      <ConfirmModal open={!!del} danger title="Delete room?" message={`"${del?.name}" will be archived (soft-deleted).`} confirmLabel="Delete" loading={remove.loading} onConfirm={doDelete} onCancel={() => setDel(null)} />
    </div>
  )
}
