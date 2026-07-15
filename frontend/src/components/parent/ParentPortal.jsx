import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useParentChild } from '../../context/ParentChildContext'
import PaymentDrawer from '../billing/PaymentDrawer'

const STANDING_STYLE = {
  Excellent: 'text-emerald-600',
  Good:      'text-blue-600',
  Watchlist: 'text-amber-600',
  Critical:  'text-red-600',
}

function AttendanceRing({ percentage }) {
  const r = 28, circ = 2 * Math.PI * r
  const pct = percentage ?? 0
  const dash = (pct / 100) * circ
  const color = pct >= 85 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute text-sm font-bold text-slate-800">{pct}%</span>
    </div>
  )
}

function fmt(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount ?? 0))
}

export default function ParentPortal({ onNavigate }) {
  const { childId, childList, setChildId, loading: childLoading } = useParentChild()
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [activeInvoice, setInvoice] = useState(null)

  useEffect(() => {
    if (!childId) return
    setLoading(true)
    setError('')
    api.get(`/api/portal/children/${childId}/overview`)
      .then(r => { setData(r.data); setError('') })
      .catch(() => setError('Failed to load your child\'s data.'))
      .finally(() => setLoading(false))
  }, [childId])

  if (childLoading) return <div className="text-center py-24 text-slate-400 text-sm">Loading...</div>

  if (childList.length === 0) return (
    <div className="max-w-md mx-auto mt-16 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
      <svg className="w-12 h-12 text-slate-200 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <h2 className="text-base font-semibold text-slate-700 mb-1">No child linked</h2>
      <p className="text-sm text-slate-400">Your account is not yet linked to a student. Please contact the school administrator.</p>
    </div>
  )

  if (loading) return <div className="text-center py-24 text-slate-400 text-sm">Loading...</div>
  if (error)   return <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
  if (!data)   return null

  const { student, attendance, fees, behaviour, latest_results, timetable_today, announcements } = data

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Child selector (if multiple children — forward-compat) */}
      {childList.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {childList.map(c => (
            <button key={c.id} onClick={() => setChildId(c.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition ${c.id === childId ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Student card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl shrink-0">
          {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-800 truncate">{student.name}</h2>
          <p className="text-sm text-slate-500">{student.grade_level}{student.section ? ` · Section ${student.section}` : ''}</p>
          {student.student_number && (
            <p className="text-xs text-slate-400 font-mono mt-0.5">{student.student_number}</p>
          )}
        </div>
        <span className={[
          'text-xs font-medium px-2.5 py-1 rounded-full shrink-0',
          student.status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-500',
        ].join(' ')}>
          {student.status}
        </span>
      </div>

      {/* Summary cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Attendance */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col items-center cursor-pointer hover:border-indigo-300 transition"
          onClick={() => onNavigate?.('portal-attendance')}>
          <AttendanceRing percentage={attendance.percentage} />
          <p className="text-xs font-semibold text-slate-600 mt-2">Attendance</p>
          <p className="text-xs text-slate-400">{attendance.present}/{attendance.total} days</p>
        </div>

        {/* Fees */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between cursor-pointer hover:border-indigo-300 transition"
          onClick={() => onNavigate?.('portal-fees')}>
          <p className="text-xs font-semibold text-slate-600">Outstanding Fees</p>
          <p className={`text-2xl font-bold tabular-nums mt-2 ${fees.outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {fmt(fees.outstanding)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{fees.invoice_count} invoice{fees.invoice_count !== 1 ? 's' : ''}</p>
        </div>

        {/* Behaviour */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between cursor-pointer hover:border-indigo-300 transition"
          onClick={() => onNavigate?.('portal-behaviour')}>
          <p className="text-xs font-semibold text-slate-600">Behaviour</p>
          <p className={`text-xl font-bold mt-2 ${STANDING_STYLE[behaviour.standing] ?? 'text-slate-600'}`}>
            {behaviour.standing}
          </p>
          <p className="text-xs text-slate-400 mt-1">{behaviour.incident_count} incident{behaviour.incident_count !== 1 ? 's' : ''}</p>
        </div>

        {/* Latest results */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between cursor-pointer hover:border-indigo-300 transition"
          onClick={() => onNavigate?.('portal-results')}>
          <p className="text-xs font-semibold text-slate-600">Latest Average</p>
          {latest_results ? (
            <>
              <p className="text-2xl font-bold text-indigo-700 tabular-nums mt-2">{latest_results.average}%</p>
              <p className="text-xs text-slate-400 mt-1">Term {latest_results.term} · {latest_results.academic_year}</p>
            </>
          ) : (
            <p className="text-sm text-slate-300 mt-2">No result records available.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Today's timetable */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Today's Schedule</h3>
            <button onClick={() => onNavigate?.('portal-timetable')}
              className="text-xs text-indigo-600 hover:text-indigo-800">View All</button>
          </div>
          {timetable_today.length === 0 ? (
            <p className="text-sm text-slate-400">No classes scheduled today.</p>
          ) : (
            <div className="space-y-2">
              {timetable_today.map((e, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div className="text-xs text-slate-400 w-28 shrink-0 tabular-nums">
                    {e.start_time && e.end_time ? `${e.start_time}–${e.end_time}` : e.period ?? ''}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{e.subject}</p>
                    {e.teacher && <p className="text-xs text-slate-400 truncate">{e.teacher}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent announcements */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Announcements</h3>
            <button onClick={() => onNavigate?.('portal-announcements')}
              className="text-xs text-indigo-600 hover:text-indigo-800">View All</button>
          </div>
          {announcements.length === 0 ? (
            <p className="text-sm text-slate-400">No recent announcements.</p>
          ) : (
            <div className="space-y-2">
              {announcements.map(a => (
                <div key={a.id} className="py-2 border-b border-slate-100 last:border-0">
                  <p className="text-sm text-slate-700 truncate">{a.subject}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.published_at}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <PaymentDrawer invoice={activeInvoice} mode="pay"
        onClose={() => setInvoice(null)}
        onSuccess={() => { setInvoice(null) }} />
    </div>
  )
}
