import { useState } from 'react'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import WeeklyGrid from '../modules/timetable/components/WeeklyGrid'
import {
  useTimetableClasses, useTimetableSubjects, useTimetableTeachers, useTimetableRooms,
  useTimetableEntries, useCreateTimetableEntry, useUpdateTimetableEntry, useDeleteTimetableEntry,
  backendMessage,
} from '../modules/timetable/hooks'

function AssignModal({ ctx, classId, subjects, teachers, rooms, onClose, onSaved }) {
  const create = useCreateTimetableEntry()
  const update = useUpdateTimetableEntry()
  const del    = useDeleteTimetableEntry()
  const existing = ctx.entry

  const [form, setForm] = useState({
    subject_id:      existing?.subject_id ?? '',
    teacher_user_id: existing?.teacher_user_id ?? '',
    room_id:         existing?.room_id ?? '',
    academic_year:   existing?.academic_year ?? String(new Date().getFullYear()),
    term:            existing?.term ?? 'Term 1',
    notes:           existing?.notes ?? '',
  })
  const [conflict, setConflict] = useState(null)   // backend conflict / validation message
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (ev) => {
    ev.preventDefault()
    setConflict(null)
    const payload = {
      class_id:        Number(classId),
      subject_id:      Number(form.subject_id),
      teacher_user_id: Number(form.teacher_user_id),
      room_id:         form.room_id ? Number(form.room_id) : null,
      period_id:       ctx.period.id,
      day_of_week:     ctx.day,
      academic_year:   form.academic_year,
      term:            form.term,
      notes:           form.notes || null,
      status:          'active',
    }
    try {
      if (existing) await update.mutate(existing.id, payload)
      else          await create.mutate(payload)
      onSaved()
    } catch (err) {
      // Backend is authoritative for conflicts — display its exact message inline.
      setConflict(backendMessage(err, 'Could not save this assignment.'))
    }
  }

  const handleDelete = async () => {
    try {
      await del.mutate(existing.id)
      onSaved()
    } catch (err) {
      setConflict(backendMessage(err))
      setConfirmDelete(false)
    }
  }

  const busy = create.loading || update.loading || del.loading
  const canSave = form.subject_id && form.teacher_user_id

  return (
    <Modal
      title={existing ? 'Edit Assignment' : 'New Assignment'}
      subtitle={`${ctx.day[0].toUpperCase()}${ctx.day.slice(1)} · ${ctx.period.name}`}
      onClose={onClose}
      maxWidth="max-w-md">
      <form onSubmit={submit} className="p-6 space-y-4">
        {conflict && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {conflict}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Subject *</label>
          <select value={form.subject_id} onChange={set('subject_id')} required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">Select subject</option>
            {(subjects ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Teacher *</label>
          <select value={form.teacher_user_id} onChange={set('teacher_user_id')} required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">Select teacher</option>
            {(teachers ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Room</label>
          <select value={form.room_id} onChange={set('room_id')}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">No room</option>
            {(rooms ?? []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Term *</label>
            <input type="text" value={form.term} onChange={set('term')} required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Academic Year *</label>
            <input type="text" value={form.academic_year} onChange={set('academic_year')} required maxLength={9}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <input type="text" value={form.notes} onChange={set('notes')}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>

        <div className="flex items-center justify-between pt-2">
          {existing ? (
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-600 hover:text-red-700 font-medium">Delete</button>
          ) : <span />}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
            <button type="submit" disabled={busy || !canSave}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
              {busy ? 'Saving...' : existing ? 'Save' : 'Assign'}
            </button>
          </div>
        </div>
      </form>

      <ConfirmModal
        open={confirmDelete}
        danger
        title="Delete this assignment?"
        message="The timetable slot will be cleared."
        confirmLabel="Delete"
        loading={del.loading}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </Modal>
  )
}

export default function TimetableBuilderPage() {
  const { data: classes, loading: classesLoading } = useTimetableClasses()
  const { data: subjects } = useTimetableSubjects()
  const { data: teachers } = useTimetableTeachers()
  const { data: roomsRaw } = useTimetableRooms({ per_page: 100, is_active: 1 })
  const rooms = roomsRaw?.data ?? roomsRaw ?? []

  const [classId, setClassId] = useState('')
  const [cell, setCell]       = useState(null)   // { period, day, entry }

  const { data: entriesRaw, loading, error, refetch } =
    useTimetableEntries(classId ? { class_id: classId, per_page: 100 } : {})
  const entries = classId ? (entriesRaw?.data ?? entriesRaw ?? []) : []

  const onCellClick = (period, day, entry) => setCell({ period, day, entry })
  const onSaved = () => { setCell(null); refetch() }

  return (
    <div className="space-y-5">
      <div className="bg-indigo-600 rounded-2xl px-6 py-4 text-white">
        <p className="text-sm text-indigo-200 font-medium">Timetable</p>
        <h2 className="text-lg font-bold">Timetable Builder</h2>
      </div>

      <div className="bg-slate-50 rounded-xl p-4">
        <select value={classId} onChange={e => setClassId(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[14rem]">
          <option value="">{classesLoading ? 'Loading classes...' : 'Select a class to build'}</option>
          {(classes ?? []).map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.grade_level}{c.section ? ` ${c.section}` : ''})</option>
          ))}
        </select>
        {classId && <p className="text-xs text-slate-500 mt-2">Click any cell to assign, edit, or remove a lesson. Conflicts are enforced by the server.</p>}
      </div>

      {!classId ? (
        <div className="border border-dashed border-slate-300 rounded-xl p-12 text-center text-sm text-slate-400">
          Select a class to start building its timetable.
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-700">Could not load entries for this class.</div>
      ) : loading ? (
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      ) : (
        <WeeklyGrid entries={entries} cellMode="class" onCellClick={onCellClick} />
      )}

      {cell && (
        <AssignModal
          ctx={cell}
          classId={classId}
          subjects={subjects}
          teachers={teachers}
          rooms={rooms}
          onClose={() => setCell(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
