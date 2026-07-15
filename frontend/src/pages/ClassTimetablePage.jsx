import { useState } from 'react'
import { useTimetableClasses, useClassTimetable } from '../modules/timetable/hooks'
import WeeklyGrid, { printTimetable } from '../modules/timetable/components/WeeklyGrid'

export default function ClassTimetablePage() {
  const { data: classes, loading: classesLoading } = useTimetableClasses()
  const [classId, setClassId]   = useState('')
  const [term, setTerm]         = useState('')
  const [year, setYear]         = useState('')

  const { data, loading, error } = useClassTimetable(classId, { term, academic_year: year })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div className="bg-indigo-600 rounded-2xl px-6 py-4 text-white flex-1">
          <p className="text-sm text-indigo-200 font-medium">Timetable</p>
          <h2 className="text-lg font-bold">Class Timetable</h2>
        </div>
        <button onClick={printTimetable} disabled={!classId}
          className="px-4 py-2.5 border border-slate-200 text-sm font-semibold rounded-xl hover:bg-slate-50 disabled:opacity-40">
          Print
        </button>
        <button disabled
          className="px-4 py-2.5 border border-slate-200 text-sm text-slate-400 rounded-xl cursor-not-allowed">
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-slate-50 rounded-xl p-4 print:hidden">
        <select value={classId} onChange={e => setClassId(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[12rem]">
          <option value="">{classesLoading ? 'Loading classes...' : 'Select a class'}</option>
          {(classes ?? []).map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.grade_level}{c.section ? ` ${c.section}` : ''})</option>
          ))}
        </select>
        <input type="text" value={term} onChange={e => setTerm(e.target.value)} placeholder="Term (e.g. Term 1)"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-40" />
        <input type="text" value={year} onChange={e => setYear(e.target.value)} placeholder="Year (2026)"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-32" />
      </div>

      {!classId ? (
        <div className="border border-dashed border-slate-300 rounded-xl p-12 text-center text-sm text-slate-400">
          Select a class to view its weekly timetable.
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-700">
          {error?.response?.status === 403
            ? 'You do not have permission to view this class timetable.'
            : 'Could not load this timetable.'}
        </div>
      ) : loading ? (
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      ) : (
        <>
          <div className="hidden print:block mb-4">
            <h2 className="text-lg font-bold">{data?.class?.name} — Weekly Timetable</h2>
          </div>
          <WeeklyGrid entries={data?.entries ?? []} cellMode="class" />
        </>
      )}
    </div>
  )
}
