import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import {
  useTimetableTeachers, useTimetablePeriods, useTeacherAvailability,
  useCreateTeacherAvailability, useUpdateTeacherAvailability, useDeleteTeacherAvailability,
  backendMessage,
} from '../modules/timetable/hooks'
import { DAYS } from '../modules/timetable/components/WeeklyGrid'

const DAY_LABEL = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri' }
const STATUS_STYLE = {
  available:   'bg-emerald-50 text-emerald-700',
  unavailable: 'bg-red-50 text-red-600',
  preferred:   'bg-indigo-50 text-indigo-700',
}

function CellModal({ ctx, teacherId, onClose, onSaved }) {
  const create = useCreateTeacherAvailability()
  const update = useUpdateTeacherAvailability()
  const del    = useDeleteTeacherAvailability()
  const existing = ctx.record

  const [status, setStatus] = useState(existing?.availability_status ?? 'unavailable')
  const [reason, setReason] = useState(existing?.reason ?? '')
  const [err, setErr]       = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const save = async (ev) => {
    ev.preventDefault()
    setErr(null)
    const payload = {
      teacher_user_id: Number(teacherId),
      day_of_week: ctx.day,
      period_id: ctx.period.id,
      availability_status: status,
      reason: reason || null,
    }
    try {
      if (existing) await update.mutate(existing.id, { availability_status: status, reason: reason || null, day_of_week: ctx.day, period_id: ctx.period.id })
      else          await create.mutate(payload)
      onSaved()
    } catch (e) { setErr(backendMessage(e)) }
  }

  const doDelete = async () => { try { await del.mutate(existing.id); onSaved() } catch (e) { setErr(backendMessage(e)); setConfirmDelete(false) } }
  const busy = create.loading || update.loading || del.loading

  return (
    <Modal title="Set Availability" subtitle={`${DAY_LABEL[ctx.day]} · ${ctx.period.name}`} onClose={onClose} maxWidth="max-w-sm">
      <form onSubmit={save} className="p-6 space-y-4">
        {err && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{err}</div>}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
            <option value="preferred">Preferred</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div className="flex items-center justify-between pt-2">
          {existing ? <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm text-red-600 hover:text-red-700 font-medium">Delete</button> : <span />}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
            <button type="submit" disabled={busy} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">{busy ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </form>
      <ConfirmModal open={confirmDelete} danger title="Delete availability?" message="This entry will be removed." confirmLabel="Delete" loading={del.loading} onConfirm={doDelete} onCancel={() => setConfirmDelete(false)} />
    </Modal>
  )
}

export default function TeacherAvailabilityPage() {
  const { user } = useAuth()
  const { role } = usePermissions()
  const isAdmin  = role === 'admin' || role === 'super_admin'

  const { data: teachers, loading: teachersLoading } = useTimetableTeachers()
  const [teacherId, setTeacherId] = useState(isAdmin ? '' : user?.id)
  const effectiveTeacherId = isAdmin ? teacherId : user?.id

  const { data: periodsRaw, loading: periodsLoading } = useTimetablePeriods({ per_page: 100 })
  const periods = (periodsRaw?.data ?? periodsRaw ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)

  const { data: availRaw, loading, refetch } = useTeacherAvailability(
    isAdmin ? (teacherId ? { teacher_user_id: teacherId, per_page: 100 } : {}) : { per_page: 100 }
  )
  const records = availRaw?.data ?? availRaw ?? []
  const byCell = {}
  for (const r of records) byCell[`${r.day_of_week}-${r.period_id}`] = r

  const [cell, setCell] = useState(null)
  const onSaved = () => { setCell(null); refetch() }

  const showGrid = !!effectiveTeacherId

  return (
    <div className="space-y-5">
      <div className="bg-slate-700 rounded-2xl px-6 py-4 text-white">
        <p className="text-sm text-slate-300 font-medium">Timetable</p>
        <h2 className="text-lg font-bold">Teacher Availability</h2>
      </div>

      {isAdmin && (
        <div className="bg-slate-50 rounded-xl p-4">
          <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[14rem]">
            <option value="">{teachersLoading ? 'Loading teachers...' : 'Select a teacher'}</option>
            {(teachers ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      {!showGrid ? (
        <div className="border border-dashed border-slate-300 rounded-xl p-12 text-center text-sm text-slate-400">Select a teacher to manage availability.</div>
      ) : periodsLoading || loading ? (
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      ) : periods.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl p-10 text-center text-sm text-slate-400">No timetable periods configured.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-slate-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 w-40">Period</th>
              {DAYS.map(d => <th key={d} className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">{DAY_LABEL[d]}</th>)}
            </tr></thead>
            <tbody>
              {periods.map(p => (
                <tr key={p.id}>
                  <td className="px-3 py-2 border-b border-slate-100 font-medium text-slate-700">{p.name}</td>
                  {DAYS.map(d => {
                    const rec = byCell[`${d}-${p.id}`]
                    return (
                      <td key={d} onClick={() => setCell({ day: d, period: p, record: rec })}
                        className="px-2 py-2 border-b border-l border-slate-100 text-center cursor-pointer hover:bg-indigo-50/40">
                        {rec
                          ? <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[rec.availability_status]}`}>{rec.availability_status}</span>
                          : <span className="text-xs text-slate-300">+</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cell && <CellModal ctx={cell} teacherId={effectiveTeacherId} onClose={() => setCell(null)} onSaved={onSaved} />}
    </div>
  )
}
