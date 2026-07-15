import { useMyTimetable } from '../modules/timetable/hooks'
import WeeklyGrid, { printTimetable } from '../modules/timetable/components/WeeklyGrid'

const CONTEXT_LABEL = {
  teacher: 'Your teaching schedule',
  parent:  "Your child's class timetable",
}

export default function MyTimetablePage() {
  const { data, loading, error } = useMyTimetable({})
  const context = data?.context
  const entries = data?.entries ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div className="bg-emerald-600 rounded-2xl px-6 py-4 text-white flex-1">
          <p className="text-sm text-emerald-200 font-medium">Timetable</p>
          <h2 className="text-lg font-bold">My Timetable</h2>
          {context && <p className="text-sm text-emerald-200 mt-0.5">{CONTEXT_LABEL[context] ?? ''}</p>}
        </div>
        <button onClick={printTimetable}
          className="px-4 py-2.5 border border-slate-200 text-sm font-semibold rounded-xl hover:bg-slate-50">
          Print
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-700">
          Could not load your timetable.
        </div>
      ) : loading ? (
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      ) : entries.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl p-12 text-center text-sm text-slate-400">
          {context === 'parent'
            ? 'No timetable has been published for the selected class.'
            : context === 'teacher'
              ? 'No scheduled classes are available.'
              : 'No personal timetable is available for your role.'}
        </div>
      ) : (
        <WeeklyGrid entries={entries} cellMode={context === 'teacher' ? 'teacher' : 'class'} />
      )}
    </div>
  )
}
