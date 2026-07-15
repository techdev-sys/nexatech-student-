// Shared weekly timetable matrix. Rows = periods, columns = weekdays.
// Pure presentation — receives entries + periods and renders a printable grid.
import { useTimetablePeriods } from '../hooks'

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const DAY_LABEL = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday' }

function fmtTime(t) {
  if (!t) return ''
  // "07:30:00"  "07:30"
  return String(t).slice(0, 5)
}

/**
 * @param {Array}  entries  timetable entries (with schoolClass/subject/teacher/room/period)
 * @param {string} cellMode 'class' | 'teacher' | 'my' — controls what each cell emphasises
 * @param {func}   onCellClick optional (period, day, entry) => void  (builder mode)
 * @param {object} availabilityMap optional { `${day}-${periodId}`: status } to badge availability
 */
export default function WeeklyGrid({ entries = [], cellMode = 'class', onCellClick, availabilityMap = {} }) {
  const { data: periodsRaw, loading } = useTimetablePeriods({ per_page: 100 })
  const periods = (periodsRaw?.data ?? periodsRaw ?? []).slice().sort((a, b) => (a.sort_order - b.sort_order))

  // Index entries by `${day}-${periodId}` for O(1) cell lookup.
  const byCell = {}
  for (const e of entries) {
    byCell[`${e.day_of_week}-${e.period_id}`] = e
  }

  if (loading) {
    return <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
  }

  if (periods.length === 0) {
    return (
      <div className="border border-dashed border-slate-300 rounded-xl p-10 text-center text-sm text-slate-400">
        No timetable periods configured. An administrator must create timetable periods first.
      </div>
    )
  }

  const clickable = typeof onCellClick === 'function'

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 print:border-0" id="timetable-print-area">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase w-40 border-b border-slate-200">Period</th>
            {DAYS.map(d => (
              <th key={d} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">{DAY_LABEL[d]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map(p => (
            <tr key={p.id} className={p.is_break ? 'bg-amber-50/40' : ''}>
              <td className="px-3 py-2 align-top border-b border-slate-100">
                <div className="font-medium text-slate-700">{p.name}</div>
                <div className="text-xs text-slate-400">{fmtTime(p.starts_at)}–{fmtTime(p.ends_at)}</div>
                {p.is_break && <span className="text-[10px] font-semibold text-amber-600 uppercase">Break</span>}
              </td>
              {DAYS.map(d => {
                const entry = byCell[`${d}-${p.id}`]
                const avail = availabilityMap[`${d}-${p.id}`]
                const base  = 'px-3 py-2 align-top border-b border-l border-slate-100 min-w-[8rem]'
                return (
                  <td
                    key={d}
                    onClick={clickable ? () => onCellClick(p, d, entry) : undefined}
                    className={[
                      base,
                      clickable ? 'cursor-pointer hover:bg-indigo-50/50 transition' : '',
                      avail === 'unavailable' ? 'bg-red-50/40' : avail === 'preferred' ? 'bg-emerald-50/40' : '',
                    ].join(' ')}
                  >
                    {entry ? (
                      <div className="space-y-0.5">
                        {cellMode === 'teacher'
                          ? <div className="font-medium text-slate-800">{entry.school_class?.name ?? entry.schoolClass?.name ?? '—'}</div>
                          : <div className="font-medium text-slate-800">{entry.subject?.name ?? '—'}</div>}
                        {cellMode !== 'teacher' && (
                          <div className="text-xs text-slate-500">{entry.teacher?.name ?? '—'}</div>
                        )}
                        {cellMode === 'teacher' && (
                          <div className="text-xs text-slate-500">{entry.subject?.name ?? '—'}</div>
                        )}
                        {entry.room && <div className="text-xs text-slate-400">{entry.room?.name}</div>}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-300">
                        {avail === 'unavailable' ? 'Unavailable' : clickable ? '+ Assign' : '—'}
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Trigger the browser print dialog. PDF generation is intentionally NOT implemented.
export function printTimetable() {
  window.print()
}
