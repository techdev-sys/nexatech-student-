import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import { SkeletonRegisterRows } from '../components/Skeleton'

const STATUSES = ['present', 'absent', 'late', 'excused']

const STATUS_COLORS = {
  present: { btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',  ring: 'ring-emerald-400' },
  absent:  { btn: 'bg-red-600 hover:bg-red-700 text-white',          ring: 'ring-red-400' },
  late:    { btn: 'bg-amber-500 hover:bg-amber-600 text-white',      ring: 'ring-amber-400' },
  excused: { btn: 'bg-blue-500 hover:bg-blue-600 text-white',        ring: 'ring-blue-400' },
}

function hasUnsavedChanges(records, existing, students) {
  return students.some(s => {
    const rec  = records[s.id]
    const prev = existing[s.id]
    if (!rec?.status) return false
    if (!prev) return true
    return rec.status !== prev.status || (rec.remarks || '') !== (prev.remarks || '')
  })
}

export default function AttendancePage() {
  const toast = useToast()

  const [classes, setClasses]     = useState([])
  const [subjects, setSubjects]   = useState([])
  const [students, setStudents]   = useState([])
  const [selectedClass, setSelectedClass]     = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [date, setDate]           = useState(() => new Date().toISOString().split('T')[0])
  const [records, setRecords]     = useState({})
  const [existing, setExisting]   = useState({})
  const [loading, setLoading]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submitLock                = useRef(false)

  // Unsaved-changes tracking
  const isDirty = useMemo(
    () => hasUnsavedChanges(records, existing, students),
    [records, existing, students]
  )

  // Browser unload guard
  useEffect(() => {
    const handler = e => {
      if (!isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Warn when changing filters with unsaved marks
  const guardedChange = useCallback((setter) => (e) => {
    if (isDirty && !confirm('You have unsaved attendance marks. Changing the filter will discard them. Continue?')) return
    setter(e.target.value)
  }, [isDirty])

  // Load classes on mount
  useEffect(() => {
    api.get('/api/v1/classes').then(r => setClasses(r.data)).catch(() => {})
  }, [])

  // Load subjects when class changes
  useEffect(() => {
    setSelectedSubject('')
    setSubjects([])
    setStudents([])
    setRecords({})
    setExisting({})
    if (!selectedClass) return
    api.get(`/api/v1/classes/${selectedClass}/subjects`).then(r => setSubjects(r.data)).catch(() => {})
  }, [selectedClass])

  // Load students + existing attendance when class/subject/date changes
  useEffect(() => {
    setStudents([])
    setRecords({})
    setExisting({})
    if (!selectedClass || !selectedSubject || !date) return

    setLoading(true)
    const cls = classes.find(c => String(c.id) === String(selectedClass))

    Promise.all([
      api.get('/api/students', { params: { grade_level: cls?.grade_level, per_page: 200 } }),
      api.get('/api/attendance', { params: { subject_id: selectedSubject, date } }),
    ]).then(([sRes, aRes]) => {
      const studentList = sRes.data?.data ?? sRes.data ?? []
      const attList     = aRes.data?.data ?? aRes.data ?? []

      const existingMap = {}
      attList.forEach(a => { existingMap[a.student_id] = a })

      const initRecords = {}
      studentList.forEach(s => {
        initRecords[s.id] = existingMap[s.id]
          ? { status: existingMap[s.id].status, remarks: existingMap[s.id].remarks ?? '' }
          : { status: '', remarks: '' }
      })

      setStudents(studentList)
      setExisting(existingMap)
      setRecords(initRecords)
    }).catch(() => {
      toast.error('Failed to load register.')
    }).finally(() => setLoading(false))
  }, [selectedClass, selectedSubject, date, classes])

  const setStatus = useCallback((studentId, status) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status: prev[studentId]?.status === status ? '' : status },
    }))
  }, [])

  const setRemarks = useCallback((studentId, remarks) => {
    setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], remarks } }))
  }, [])

  const markAll = useCallback(status => {
    setRecords(prev => {
      const next = { ...prev }
      students.forEach(s => { next[s.id] = { ...next[s.id], status } })
      return next
    })
  }, [students])

  const handleSubmit = async () => {
    // Double-submit lock — prevents rapid double-click
    if (submitLock.current) return
    submitLock.current = true

    const filled = students.filter(s => records[s.id]?.status)
    if (!filled.length) {
      toast.error('Mark at least one student before submitting.')
      submitLock.current = false
      return
    }

    setSubmitting(true)
    try {
      await api.post('/api/attendance/bulk', {
        subject_id: Number(selectedSubject),
        date,
        records: filled.map(s => ({
          student_id: s.id,
          status:     records[s.id].status,
          remarks:    records[s.id].remarks || undefined,
        })),
      })
      toast.success(`Attendance saved for ${filled.length} student${filled.length > 1 ? 's' : ''}.`)

      // Update existing map so isDirty resets to false
      setExisting(prev => {
        const next = { ...prev }
        filled.forEach(s => {
          next[s.id] = { status: records[s.id].status, remarks: records[s.id].remarks ?? '' }
        })
        return next
      })
    } catch {
      // axios interceptor shows toast; records preserved so user can retry
    } finally {
      setSubmitting(false)
      submitLock.current = false
    }
  }

  const markedCount  = useMemo(() => students.filter(s => records[s.id]?.status).length, [students, records])
  const presentCount = useMemo(() => students.filter(s => records[s.id]?.status === 'present').length, [students, records])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Date</label>
          <input type="date" value={date} onChange={guardedChange(setDate)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Class</label>
          <select value={selectedClass} onChange={guardedChange(setSelectedClass)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-[160px]">
            <option value="">Select class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Subject</label>
          <select value={selectedSubject} onChange={guardedChange(setSelectedSubject)}
            disabled={!selectedClass}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-[160px] disabled:opacity-50">
            <option value="">Select subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {isDirty && (
          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg">
            Unsaved changes
          </span>
        )}
      </div>

      {/* Register */}
      {loading && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Student</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide" colSpan={4}>Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Remarks</th>
              </tr>
            </thead>
            <tbody><SkeletonRegisterRows rows={8} /></tbody>
          </table>
        </div>
      )}

      {!loading && students.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-500">{markedCount}/{students.length} marked · {presentCount} present</span>
              <div className="flex items-center gap-1.5 ml-2">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => markAll(s)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${STATUS_COLORS[s].btn}`}>
                    All {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleSubmit} disabled={submitting || markedCount === 0}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center gap-2">
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  Saving...
                </>
              ) : 'Submit Register'}
            </button>
          </div>

          {/* Register table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Student</th>
                  {STATUSES.map(s => (
                    <th key={s} className="px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {s.charAt(0).toUpperCase()}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const rec     = records[s.id] ?? { status: '', remarks: '' }
                  const isExist = !!existing[s.id]
                  return (
                    <tr key={s.id} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <p className="font-medium text-slate-800">{s.first_name} {s.last_name}</p>
                        {isExist && <span className="text-xs text-indigo-500">already marked</span>}
                      </td>
                      {STATUSES.map(st => (
                        <td key={st} className="px-2 py-2.5 text-center">
                          <button onClick={() => setStatus(s.id, st)}
                            className={`w-8 h-8 rounded-full text-xs font-bold transition ring-offset-1 ${rec.status === st ? `${STATUS_COLORS[st].btn} ring-2 ${STATUS_COLORS[st].ring}` : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                            title={st.charAt(0).toUpperCase() + st.slice(1)}>
                            {st[0].toUpperCase()}
                          </button>
                        </td>
                      ))}
                      <td className="px-4 py-2.5">
                        <input type="text" value={rec.remarks} onChange={e => setRemarks(s.id, e.target.value)}
                          placeholder="Optional"
                          className="w-full border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && !selectedSubject && (
        <div className="text-center py-16 text-slate-400 text-sm">
          Select a date, class, and subject above to open the register.
        </div>
      )}

      {!loading && selectedSubject && students.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">
          No students found for this class.
        </div>
      )}
    </div>
  )
}
