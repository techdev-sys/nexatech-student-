import { useState, useEffect } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'

const BLANK = {
  exam_session_id: '', class_id: '', subject_id: '',
  room_id: '', supervisor_user_id: '',
  exam_date: '', start_time: '', end_time: '', notes: '',
}

function EntryForm({ initial, sessions, classes, subjects, rooms, teachers, onSave, onClose }) {
  const [form, setForm]     = useState(initial ? { ...BLANK, ...initial,
    room_id: initial.room_id ?? '',
    supervisor_user_id: initial.supervisor_user_id ?? '',
  } : BLANK)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const payload = {
        ...form,
        exam_session_id:    Number(form.exam_session_id)     || null,
        class_id:           Number(form.class_id)            || null,
        subject_id:         Number(form.subject_id)          || null,
        room_id:            Number(form.room_id)             || null,
        supervisor_user_id: Number(form.supervisor_user_id)  || null,
      }
      if (initial?.id) {
        const { data } = await api.patch(`/api/exams/timetable/${initial.id}`, payload)
        onSave(data, 'updated')
      } else {
        const { data } = await api.post('/api/exams/timetable', payload)
        onSave(data, 'created')
      }
    } catch (err) {
      setErrors(err.response?.data?.errors ?? {})
    } finally {
      setSaving(false)
    }
  }

  const sel = (label, key, opts, required = false) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}{required ? ' *' : ''}</label>
      <select value={form[key]} onChange={set(key)} required={required}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors[key] ? 'border-red-400' : 'border-slate-200'}`}>
        <option value="">Select</option>
        {opts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key][0]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <div className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {sel('Exam Session', 'exam_session_id', sessions.map(s => ({ id: s.id, label: s.name })), true)}
          {sel('Class', 'class_id', classes.map(c => ({ id: c.id, label: c.name })), true)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {sel('Subject', 'subject_id', subjects.map(s => ({ id: s.id, label: s.name })), true)}
          {sel('Room (optional)', 'room_id', rooms.map(r => ({ id: r.id, label: r.name })))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Exam Date *</label>
            <input type="date" value={form.exam_date} onChange={set('exam_date')} required
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.exam_date ? 'border-red-400' : 'border-slate-200'}`} />
            {errors.exam_date && <p className="text-xs text-red-500 mt-1">{errors.exam_date[0]}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Start Time *</label>
            <input type="time" value={form.start_time} onChange={set('start_time')} required
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.start_time ? 'border-red-400' : 'border-slate-200'}`} />
            {errors.start_time && <p className="text-xs text-red-500 mt-1">{errors.start_time[0]}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">End Time *</label>
            <input type="time" value={form.end_time} onChange={set('end_time')} required
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.end_time ? 'border-red-400' : 'border-slate-200'}`} />
            {errors.end_time && <p className="text-xs text-red-500 mt-1">{errors.end_time[0]}</p>}
          </div>
        </div>
        {sel('Supervisor (optional)', 'supervisor_user_id', teachers.map(t => ({ id: t.id, label: t.name })))}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        {Object.keys(errors).filter(k => !['exam_session_id','class_id','subject_id','room_id','exam_date','start_time','end_time','supervisor_user_id'].includes(k)).map(k => (
          <p key={k} className="text-xs text-red-500">{errors[k][0]}</p>
        ))}
      </div>
      <div className="px-6 pb-5 flex justify-end gap-2">
        <button type="button" onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Saving...' : initial?.id ? 'Update' : 'Schedule Exam'}
        </button>
      </div>
    </form>
  )
}

export default function ExamTimetablePage() {
  const { show: toast } = useToast()
  const [entries, setEntries]   = useState([])
  const [sessions, setSessions] = useState([])
  const [classes, setClasses]   = useState([])
  const [subjects, setSubjects] = useState([])
  const [rooms, setRooms]       = useState([])
  const [teachers, setTeachers] = useState([])
  const [filterSession, setFilterSession] = useState('')
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [delTarget, setDelTarget] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/api/exams/sessions'),
      api.get('/api/v1/classes'),
      api.get('/api/subjects'),
      api.get('/api/timetable/rooms'),
      api.get('/api/users', { params: { per_page: 200 } }),
    ]).then(([s, c, sub, r, u]) => {
      setSessions(s.data)
      setClasses(c.data)
      setSubjects(sub.data?.data ?? sub.data)
      setRooms(r.data)
      setTeachers((u.data?.data ?? u.data).filter(u => ['teacher','admin','super_admin'].includes(u.role)))
    })
  }, [])

  const load = () => {
    setLoading(true)
    const params = filterSession ? { exam_session_id: filterSession } : {}
    api.get('/api/exams/timetable', { params })
      .then(r => setEntries(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [filterSession])

  const handleSave = (entry, verb) => {
    setEntries(prev => verb === 'created'
      ? [entry, ...prev]
      : prev.map(e => e.id === entry.id ? entry : e))
    toast(`Exam timetable entry ${verb}.`, 'success')
    setModal(null)
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/api/exams/timetable/${delTarget.id}`)
      setEntries(prev => prev.filter(e => e.id !== delTarget.id))
      toast('Entry deleted.', 'success')
    } finally {
      setDelTarget(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Exam Timetable</h2>
          <p className="text-sm text-slate-500">{entries.length} scheduled exam{entries.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterSession} onChange={e => setFilterSession(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Sessions</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={() => setModal('create')}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
            + Schedule Exam
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-xl" />
        ))}</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">No examination schedules available.</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Date','Time','Class','Subject','Room','Supervisor',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{e.exam_date}</td>
                  <td className="px-4 py-3 text-slate-600">{e.start_time} – {e.end_time}</td>
                  <td className="px-4 py-3">{e.school_class?.name ?? e.class_id}</td>
                  <td className="px-4 py-3">{e.subject?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{e.room?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{e.supervisor?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setModal(e)}
                        className="px-2 py-1 text-xs rounded border border-slate-200 hover:bg-slate-100">Edit</button>
                      <button onClick={() => setDelTarget(e)}
                        className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'Schedule Exam' : 'Edit Exam Entry'}
          onClose={() => setModal(null)}>
          <EntryForm initial={modal === 'create' ? null : modal}
            sessions={sessions} classes={classes} subjects={subjects}
            rooms={rooms} teachers={teachers}
            onSave={handleSave} onClose={() => setModal(null)} />
        </Modal>
      )}

      {delTarget && (
        <ConfirmModal title="Delete Exam Entry"
          message={`Remove this exam for ${delTarget.subject?.name ?? 'subject'} on ${delTarget.exam_date}?`}
          onConfirm={handleDelete} onCancel={() => setDelTarget(null)} />
      )}
    </div>
  )
}
