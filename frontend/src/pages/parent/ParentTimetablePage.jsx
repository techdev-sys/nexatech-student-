import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useParentChild } from '../../context/ParentChildContext'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday']

const DAY_COLORS = [
  'bg-indigo-50 border-indigo-200',
  'bg-blue-50 border-blue-200',
  'bg-violet-50 border-violet-200',
  'bg-cyan-50 border-cyan-200',
  'bg-emerald-50 border-emerald-200',
  'bg-amber-50 border-amber-200',
]

export default function ParentTimetablePage() {
  const { childId } = useParentChild()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!childId) return
    setLoading(true)
    setError('')
    api.get(`/api/portal/children/${childId}/timetable`)
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load timetable.'))
      .finally(() => setLoading(false))
  }, [childId])

  if (!childId) return (
    <div className="text-sm text-slate-500 text-center py-16">No child linked to your account.</div>
  )
  if (loading) return <div className="text-center py-16 text-slate-400 text-sm">Loading...</div>
  if (error)   return <p className="text-sm text-red-500">{error}</p>

  const entries = data?.entries ?? []
  const klass   = data?.class

  if (entries.length === 0) return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-12 text-center max-w-2xl">
      <p className="text-slate-400 text-sm">No timetable available for your child's class.</p>
    </div>
  )

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

  // Group entries by day
  const byDay = DAYS.reduce((acc, day) => {
    const slots = entries.filter(e => e.day_of_week === day)
    if (slots.length > 0) acc[day] = slots
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-4xl">
      {klass && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
            {klass.name?.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{klass.name}</p>
            <p className="text-xs text-slate-500">{klass.grade_level}{klass.section ? ` · Section ${klass.section}` : ''}</p>
          </div>
        </div>
      )}

      {Object.entries(byDay).map(([day, slots], i) => (
        <div key={day} className={`rounded-2xl border shadow-sm overflow-hidden ${DAY_COLORS[i % DAY_COLORS.length]}`}>
          <div className={`px-5 py-3 border-b ${DAY_COLORS[i % DAY_COLORS.length]} flex items-center justify-between`}>
            <h3 className="font-semibold text-slate-700 capitalize">{day}</h3>
            {day === today && (
              <span className="text-xs font-medium bg-indigo-600 text-white px-2 py-0.5 rounded-full">Today</span>
            )}
          </div>
          <div className="bg-white divide-y divide-slate-100">
            {slots.map((slot, j) => (
              <div key={j} className="px-5 py-3 flex items-center gap-5">
                <div className="w-28 shrink-0 text-xs text-slate-500 tabular-nums">
                  {slot.start_time && slot.end_time
                    ? `${slot.start_time} – ${slot.end_time}`
                    : slot.period ?? ''}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{slot.subject ?? '—'}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {[slot.teacher, slot.room].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
