import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { useTimetableTeachers, useTeacherTimetable } from '../modules/timetable/hooks'
import WeeklyGrid, { printTimetable, DAYS } from '../modules/timetable/components/WeeklyGrid'

export default function TeacherTimetablePage() {
  const { user } = useAuth()
  const { role } = usePermissions()
  const isAdmin  = role === 'admin' || role === 'super_admin'

  // Admin picks a teacher; a teacher auto-loads their own timetable (id from auth).
  const { data: teachers, loading: teachersLoading } = useTimetableTeachers()
  const [teacherId, setTeacherId] = useState(isAdmin ? '' : user?.id)

  useEffect(() => { if (!isAdmin) setTeacherId(user?.id) }, [isAdmin, user?.id])

  const { data, loading, error } = useTeacherTimetable(teacherId, {})

  // Map availability for badges: `${day}-${periodId}`  status
  const availabilityMap = {}
  for (const a of data?.availability ?? []) {
    availabilityMap[`${a.day_of_week}-${a.period_id}`] = a.availability_status
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div className="bg-violet-600 rounded-2xl px-6 py-4 text-white flex-1">
          <p className="text-sm text-violet-200 font-medium">Timetable</p>
          <h2 className="text-lg font-bold">Teacher Timetable</h2>
        </div>
        <button onClick={printTimetable} disabled={!teacherId}
          className="px-4 py-2.5 border border-slate-200 text-sm font-semibold rounded-xl hover:bg-slate-50 disabled:opacity-40">
          Print
        </button>
      </div>

      {isAdmin && (
        <div className="bg-slate-50 rounded-xl p-4 print:hidden">
          <select value={teacherId ?? ''} onChange={e => setTeacherId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 min-w-[14rem]">
            <option value="">{teachersLoading ? 'Loading teachers...' : 'Select a teacher'}</option>
            {(teachers ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      {!teacherId ? (
        <div className="border border-dashed border-slate-300 rounded-xl p-12 text-center text-sm text-slate-400">
          {isAdmin ? 'Select a teacher to view their timetable.' : 'No timetable available.'}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-700">
          {error?.response?.status === 403
            ? 'You can only view your own timetable.'
            : 'Could not load this timetable.'}
        </div>
      ) : loading ? (
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-xs print:hidden">
            <span className="px-2 py-1 rounded bg-red-50 text-red-600">Red = unavailable</span>
            <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">Green = preferred</span>
          </div>
          <div className="hidden print:block mb-4">
            <h2 className="text-lg font-bold">{data?.teacher?.name} — Weekly Timetable</h2>
          </div>
          <WeeklyGrid entries={data?.entries ?? []} cellMode="teacher" availabilityMap={availabilityMap} />
        </>
      )}
    </div>
  )
}
