import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import { SkeletonTableRows, SkeletonProfileDrawer } from '../components/Skeleton'
import PaymentDrawer from '../components/billing/PaymentDrawer'
import { usePermissions } from '../hooks/usePermissions'
import ConfirmModal from '../components/ConfirmModal'

// ── Behaviour tab helpers ─────────────────────────────────────────────────────

const STANDING_BADGE = {
  Excellent: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Good:      'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  Watchlist: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Critical:  'bg-red-50 text-red-700 ring-1 ring-red-200',
}

const BEH_CAT_BADGE = {
  positive: 'bg-emerald-50 text-emerald-700',
  negative: 'bg-red-50 text-red-600',
  neutral:  'bg-slate-100 text-slate-600',
}

function BehaviourTab({ studentId, canRecord, onAssign }) {
  const [summary, setSummary]     = useState(null)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!studentId) return
    setLoading(true)
    Promise.all([
      api.get(`/api/students/${studentId}/behaviour-summary`).catch(() => null),
      api.get(`/api/students/${studentId}/behaviour-incidents`, { params: { per_page: 50 } }).catch(() => null),
    ]).then(([s, i]) => {
      setSummary(s?.data ?? null)
      setIncidents(i?.data?.data ?? [])
      setLoading(false)
    })
  }, [studentId])

  if (loading) return <SkeletonProfileDrawer />

  return (
    <div className="space-y-4">
      {/* Score summary */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-xl p-4 col-span-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-0.5">Behaviour Score</p>
              <p className={`text-2xl font-bold tabular-nums ${summary.total_points >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {summary.total_points >= 0 ? `+${summary.total_points}` : summary.total_points}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{summary.incident_count} incident{summary.incident_count !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${STANDING_BADGE[summary.standing] ?? 'bg-slate-100 text-slate-600'}`}>
                {summary.standing}
              </span>
              {canRecord && (
                <button onClick={onAssign}
                  className="text-xs px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition">
                  Assign Incident
                </button>
              )}
            </div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-xs text-emerald-600 font-medium">Positive</p>
            <p className="text-lg font-bold text-emerald-700">+{summary.positive_points}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-xs text-red-500 font-medium">Negative</p>
            <p className="text-lg font-bold text-red-700">{summary.negative_points}</p>
          </div>
        </div>
      )}

      {/* Incident list */}
      {incidents.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No behaviour incidents recorded.</p>
      ) : (
        <div className="space-y-1.5">
          {incidents.map(inc => (
            <div key={inc.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-slate-50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{inc.incidentType?.name ?? '—'}</p>
                <p className="text-xs text-slate-400">
                  {inc.incident_date ? new Date(inc.incident_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  {inc.incidentType?.category && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium capitalize ${BEH_CAT_BADGE[inc.incidentType.category]}`}>
                      {inc.incidentType.category}
                    </span>
                  )}
                </p>
              </div>
              <span className={`text-sm font-bold tabular-nums shrink-0 ${inc.points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {inc.points >= 0 ? `+${inc.points}` : inc.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUSES = ['active', 'inactive', 'transferred', 'graduated']

const STATUS_BADGE = {
  active:      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  inactive:    'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  transferred: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  graduated:   'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
}

const ATT_BADGE = {
  present: 'bg-emerald-50 text-emerald-700',
  absent:  'bg-red-50 text-red-600',
  late:    'bg-amber-50 text-amber-700',
  excused: 'bg-blue-50 text-blue-600',
}

const INV_BADGE = {
  paid:           'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  partially_paid: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  unpaid:         'bg-red-50 text-red-600 ring-1 ring-red-200',
}

function fmt(n, curr = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(Number(n ?? 0))
}

// ── Student form (create / edit) ──────────────────────────────────────────────

const BLANK = {
  first_name: '', last_name: '', student_number: '', email: '', phone: '',
  date_of_birth: '', grade_level: '', section: '', parent_name: '',
  parent_phone: '', parent_email: '', enrollment_date: '',
  status: 'active',
}

function StudentForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ?? BLANK)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '')
      )
      if (initial?.id) {
        const { data } = await api.patch(`/api/students/${initial.id}`, payload)
        onSave(data, 'updated')
      } else {
        const { data } = await api.post('/api/students', payload)
        onSave(data, 'created')
      }
    } catch (err) {
      setErrors(err.response?.data?.errors ?? { _: err.response?.data?.message ?? 'Failed to save.' })
    } finally {
      setSaving(false)
    }
  }

  const F = ({ label, k, type = 'text', opt = false, placeholder = '' }) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}{opt && <span className="text-slate-400 font-normal ml-1">(optional)</span>}
      </label>
      <input type={type} value={form[k]} onChange={set(k)} placeholder={placeholder}
        required={!opt}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors[k] ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
      />
      {errors[k] && <p className="text-xs text-red-500 mt-1">{errors[k][0]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <div className="px-6 py-5 overflow-y-auto max-h-[65vh] space-y-5">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Personal</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="First name" k="first_name" />
            <F label="Last name"  k="last_name" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <F label="Student number" k="student_number" opt placeholder="STU-001" />
            <F label="Date of birth"  k="date_of_birth"  opt type="date" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <F label="Email" k="email" type="email" opt />
            <F label="Phone" k="phone" opt placeholder="+263 77..." />
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Academic</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Grade / Level" k="grade_level" placeholder="Form 3" />
            <F label="Section" k="section" opt placeholder="A" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <F label="Enrollment date" k="enrollment_date" type="date" opt />
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={set('status')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Parent / Guardian</p>
          <div className="space-y-3">
            <F label="Parent name"  k="parent_name"  opt />
            <div className="grid grid-cols-2 gap-3">
              <F label="Parent phone" k="parent_phone" opt />
              <F label="Parent email" k="parent_email" type="email" opt />
            </div>
          </div>
        </div>

        {errors._ && <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{errors._}</div>}
      </div>

      <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center gap-2">
          {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
          {saving ? 'Saving...' : initial?.id ? 'Save changes' : 'Register Student'}
        </button>
      </div>
    </form>
  )
}

// ── Student profile drawer ────────────────────────────────────────────────────

function ProfileDrawer({ studentId, onClose, onEdit, isAdmin, onNavigateAssign }) {
  const { can } = usePermissions()
  const [tab, setTab]           = useState('info')
  const [student, setStudent]   = useState(null)
  const [invoices, setInvoices] = useState([])
  const [reportCard, setReportCard] = useState(null)
  const [rcTerm, setRcTerm]     = useState('3')
  const [rcYear, setRcYear]     = useState('2025')
  const [loadingRc, setLoadingRc] = useState(false)
  const [payInvoice, setPayInvoice] = useState(null)

  useEffect(() => {
    if (!studentId) return
    setTab('info')
    setStudent(null)
    setInvoices([])
    setReportCard(null)

    const ctrl = new AbortController()
    api.get(`/api/students/${studentId}`,             { signal: ctrl.signal }).then(r => setStudent(r.data)).catch(() => {})
    api.get(`/api/invoices?student_id=${studentId}`, { signal: ctrl.signal }).then(r => setInvoices(r.data?.data ?? r.data)).catch(() => {})
    return () => ctrl.abort()
  }, [studentId])

  // Close on Escape
  useEffect(() => {
    if (!studentId) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [studentId, onClose])

  const loadReportCard = () => {
    if (!studentId) return
    setLoadingRc(true)
    api.get(`/api/students/${studentId}/report-card`, { params: { term: rcTerm, academic_year: rcYear } })
      .then(r => setReportCard(r.data))
      .catch(() => setReportCard(null))
      .finally(() => setLoadingRc(false))
  }

  const downloadPdf = async () => {
    try {
      const res = await api.get(`/api/students/${studentId}/report-card/pdf`, {
        params: { term: rcTerm, academic_year: rcYear },
        responseType: 'blob',
      })
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `report-card-term${rcTerm}-${rcYear}.pdf`
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      // toast handled by caller if needed
    }
  }

  const TABS = [
    { key: 'info',        label: 'Profile' },
    { key: 'grades',      label: 'Grades' },
    { key: 'attendance',  label: 'Attendance' },
    { key: 'invoices',    label: 'Invoices' },
    { key: 'report-card', label: 'Report Card' },
    ...(can('view_behaviour') ? [{ key: 'behaviour', label: 'Behaviour' }] : []),
  ]

  return (
    <>
      <div onClick={onClose}
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${studentId ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />

      <div className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${studentId ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
              {student ? `${student.first_name?.[0]}${student.last_name?.[0]}` : '...'}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-800 truncate">
                {student ? `${student.first_name} ${student.last_name}` : 'Loading...'}
              </h2>
              {student && (
                <p className="text-xs text-slate-400">
                  {student.grade_level}{student.section ? ` · ${student.section}` : ''} · {student.student_number ?? 'No number'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && student && (
              <button onClick={() => onEdit(student)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition">
                Edit
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-5 shrink-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {!student ? (
            <SkeletonProfileDrawer />
          ) : tab === 'info' ? (
            <ProfileTab student={student} />
          ) : tab === 'grades' ? (
            <GradesTab grades={student.grades ?? []} />
          ) : tab === 'attendance' ? (
            <AttendanceTab attendance={student.attendance ?? []} />
          ) : tab === 'invoices' ? (
            <InvoicesTab invoices={invoices} onPay={setPayInvoice} />
          ) : tab === 'report-card' ? (
            <ReportCardTab
              reportCard={reportCard} loading={loadingRc}
              term={rcTerm} year={rcYear}
              onTermChange={setRcTerm} onYearChange={setRcYear}
              onLoad={loadReportCard} onDownload={downloadPdf}
            />
          ) : tab === 'behaviour' ? (
            <BehaviourTab
              studentId={studentId}
              canRecord={can('record_behaviour_incident')}
              onAssign={() => { onClose(); onNavigateAssign?.() }}
            />
          ) : null}
        </div>
      </div>

      <PaymentDrawer invoice={payInvoice} mode="pay"
        onClose={() => setPayInvoice(null)}
        onSuccess={() => { setPayInvoice(null); api.get(`/api/invoices?student_id=${studentId}`).then(r => setInvoices(r.data?.data ?? r.data)) }}
      />
    </>
  )
}

function fmtDate(val) {
  if (!val) return null
  const d = new Date(val)
  if (isNaN(d)) return val
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ProfileRow({ label, value, children }) {
  return (
    <div className="flex gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 w-32 shrink-0">{label}</span>
      <span className="text-sm text-slate-800 font-medium">
        {children ?? (value ? value : <span className="text-slate-400">—</span>)}
      </span>
    </div>
  )
}

function ProfileTab({ student }) {
  return (
    <div className="space-y-5">
      <Section title="Personal">
        <ProfileRow label="Full name"     value={`${student.first_name} ${student.last_name}`} />
        <ProfileRow label="Student #"     value={student.student_number} />
        <ProfileRow label="Email"         value={student.email} />
        <ProfileRow label="Phone"         value={student.phone} />
        <ProfileRow label="Date of birth" value={fmtDate(student.date_of_birth)} />
        <ProfileRow label="Status">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[student.status]}`}>
            {student.status}
          </span>
        </ProfileRow>
      </Section>
      <Section title="Academic">
        <ProfileRow label="Grade / Level"    value={student.grade_level} />
        <ProfileRow label="Section"          value={student.section} />
        <ProfileRow label="Enrollment date"  value={fmtDate(student.enrollment_date)} />
      </Section>
      <Section title="Parent / Guardian">
        <ProfileRow label="Name"  value={student.parent_name} />
        <ProfileRow label="Phone" value={student.parent_phone} />
        <ProfileRow label="Email" value={student.parent_email} />
        {student.parentUser && (
          <ProfileRow label="Portal account" value={`${student.parentUser.name} (${student.parentUser.email})`} />
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{title}</p>
      {children}
    </div>
  )
}

function GradesTab({ grades }) {
  if (!grades.length) return <Empty msg="No grade records available." />
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Assessment</th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Term</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Score</th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Grade</th>
          </tr>
        </thead>
        <tbody>
          {grades.map((g, i) => (
            <tr key={g.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
              <td className="px-3 py-2.5 text-slate-700">{g.subject?.name ?? '—'}</td>
              <td className="px-3 py-2.5 text-slate-500 text-xs">{g.assessment?.name ?? '—'}</td>
              <td className="px-3 py-2.5 text-center text-slate-500">{g.term}</td>
              <td className="px-3 py-2.5 text-right font-mono">{g.score ?? '—'}</td>
              <td className="px-3 py-2.5 text-center">
                {g.grade_letter && (
                  <span className={`text-xs font-bold ${g.grade_letter === 'A' ? 'text-emerald-600' : g.grade_letter.startsWith('B') ? 'text-blue-600' : g.grade_letter.startsWith('C') ? 'text-amber-600' : 'text-red-500'}`}>
                    {g.grade_letter}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AttendanceTab({ attendance }) {
  if (!attendance.length) return <Empty msg="No attendance records available." />
  return (
    <div className="space-y-1.5">
      {attendance.slice(0, 50).map(a => (
        <div key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-50">
          <span className="text-xs text-slate-500">{a.date}</span>
          <span className="text-sm text-slate-700">{a.subject?.name ?? '—'}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ATT_BADGE[a.status] ?? 'bg-slate-100 text-slate-500'}`}>
            {a.status}
          </span>
        </div>
      ))}
    </div>
  )
}

function InvoicesTab({ invoices, onPay }) {
  if (!invoices?.length) return <Empty msg="No invoices found." />
  return (
    <div className="space-y-2">
      {invoices.map(inv => (
        <div key={inv.id} className="bg-slate-50 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700">{inv.fee_structure?.title ?? inv.invoice_number}</p>
            <p className="text-xs text-slate-400">Due {inv.due_date} · <span className="font-mono">{inv.invoice_number}</span></p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold tabular-nums text-slate-700">
              {fmt(inv.balance_amount, inv.fee_structure?.currency ?? 'USD')}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${INV_BADGE[inv.status]}`}>
              {inv.status === 'partially_paid' ? 'Partial' : inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
            </span>
            {inv.status !== 'paid' && (
              <button onClick={() => onPay(inv)}
                className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition">
                Pay
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function ReportCardTab({ reportCard, loading, term, year, onTermChange, onYearChange, onLoad, onDownload }) {
  return (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="flex flex-wrap items-end gap-3 bg-slate-50 rounded-xl p-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Term</label>
          <select value={term} onChange={e => onTermChange(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Academic year</label>
          <input type="number" value={year} onChange={e => onYearChange(e.target.value)} min={2020} max={2099}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-24" />
        </div>
        <button onClick={onLoad} disabled={loading}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
          {loading ? 'Loading...' : 'Load'}
        </button>
        {reportCard && (
          <button onClick={onDownload}
            className="px-4 py-1.5 border border-slate-200 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            PDF
          </button>
        )}
      </div>

      {reportCard && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">Subjects</p>
              <p className="text-xl font-bold text-slate-800">{reportCard.summary.total_subjects}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-600">Passed</p>
              <p className="text-xl font-bold text-emerald-700">{reportCard.summary.passed}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-xs text-red-500">Failed</p>
              <p className="text-xl font-bold text-red-700">{reportCard.summary.failed}</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <p className="text-xs text-indigo-600">Average</p>
              <p className="text-xl font-bold text-indigo-700">{reportCard.summary.overall_grade}</p>
            </div>
          </div>

          {/* Subject rows */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Score</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Grade</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Result</th>
                </tr>
              </thead>
              <tbody>
                {reportCard.subjects.map((s, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-3 py-2.5 font-medium text-slate-700">{s.subject.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{s.terminal_percentage?.toFixed(1)}%</td>
                    <td className="px-3 py-2.5 text-center font-bold text-indigo-600">{s.grade_letter}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {s.passed ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Empty({ msg }) {
  return <p className="text-sm text-slate-400 text-center py-12">{msg}</p>
}

// ── Parent link modal ─────────────────────────────────────────────────────────

function LinkParentModal({ student, onClose, onLinked }) {
  const [users, setUsers]   = useState([])
  const [userId, setUserId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    api.get('/api/users?role=parent').then(r => setUsers(r.data))
  }, [])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    setError('')
    try {
      const { data } = await api.post(`/api/students/${student.id}/link-parent`, { user_id: parseInt(userId) })
      onLinked(data)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to link parent.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Link Parent Account" subtitle={`Linking a portal account to ${student.first_name} ${student.last_name}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="px-6 py-5 space-y-4">
          {users.length === 0 ? (
            <p className="text-sm text-slate-500">No parent accounts found. Create one in Staff &amp; Parents first.</p>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Select parent account</label>
              <select value={userId} onChange={e => setUserId(e.target.value)} required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">Choose</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
          <button type="submit" disabled={saving || !userId}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
            {saving ? 'Linking...' : 'Link parent'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main directory ────────────────────────────────────────────────────────────

export default function StudentsPage({ onNavigate }) {
  const { user } = useAuth()
  const toast = useToast()
  const { can } = usePermissions()
  const isAdmin = can('manage_finance') // same set: super_admin + admin

  const [students, setStudents]       = useState([])
  const [meta, setMeta]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [page, setPage]               = useState(1)
  const [search, setSearch]           = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [modalMode, setModalMode]     = useState(null) // 'add' | 'edit'
  const [editTarget, setEditTarget]   = useState(null)
  const [profileId, setProfileId]     = useState(null)
  const [linkTarget, setLinkTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)

  const debounceRef = useRef(null)
  const handleSearch = v => {
    setSearch(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDebounced(v); setPage(1) }, 350)
  }

  const fetchStudents = useCallback(() => {
    setLoading(true)
    const params = { page, per_page: 20 }
    if (debouncedSearch) params.search = debouncedSearch
    if (gradeFilter)     params.grade_level = gradeFilter
    if (statusFilter)    params.status = statusFilter
    api.get('/api/students', { params })
      .then(r => { setStudents(r.data.data); setMeta(r.data.meta) })
      .catch(() => toast.error('Failed to load students.'))
      .finally(() => setLoading(false))
  }, [page, debouncedSearch, gradeFilter, statusFilter])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  const handleSaved = (student, mode) => {
    setModalMode(null)
    setEditTarget(null)
    toast.success(`Student ${mode}.`)
    fetchStudents()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/students/${deleteTarget.id}`)
      toast.success('Student deleted.')
      setDeleteTarget(null)
      fetchStudents()
    } catch {
      // axios interceptor already shows toast
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = s => { setEditTarget(s); setModalMode('edit') }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <input type="search" placeholder="Search name or number" value={search} onChange={e => handleSearch(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-52" />
          <input type="text" placeholder="Grade level" value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setPage(1) }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36" />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        {isAdmin && (
          <button onClick={() => setModalMode('add')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Student
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        {loading ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['#','Name','Student #','Grade','Status',''].map((h,i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody><SkeletonTableRows cols={6} rows={8} /></tbody>
          </table>
        ) : students.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No students found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Student #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Grade</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id} onClick={() => setProfileId(s.id)}
                  className={`border-b border-slate-100 last:border-0 cursor-pointer hover:bg-indigo-50/50 transition ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 text-slate-400 text-xs">{(meta?.from ?? 0) + i}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                    {s.first_name} {s.last_name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.student_number ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.grade_level}{s.section ? ` ${s.section}` : ''}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[s.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-end">
                      {isAdmin && (
                        <>
                          <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition" title="Edit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => setLinkTarget(s)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition" title="Link parent">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </button>
                          <button onClick={() => setDeleteTarget(s)} className="p-1.5 text-slate-400 hover:text-red-600 rounded transition" title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Showing {meta.from}–{meta.to} of {meta.total}</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition text-xs">← Prev</button>
            <span className="px-3 py-1.5 text-xs">Page {page} of {meta.last_page}</span>
            <button disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition text-xs">Next</button>
          </div>
        </div>
      )}

      {/* Modals */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <Modal
          title={modalMode === 'add' ? 'Add Student' : 'Edit Student'}
          onClose={() => { setModalMode(null); setEditTarget(null) }}
          maxWidth="max-w-2xl"
        >
          <StudentForm
            initial={editTarget}
            onSave={handleSaved}
            onClose={() => { setModalMode(null); setEditTarget(null) }}
          />
        </Modal>
      )}

      {linkTarget && (
        <LinkParentModal
          student={linkTarget}
          onClose={() => setLinkTarget(null)}
          onLinked={() => { setLinkTarget(null); toast.success('Parent linked.'); fetchStudents() }}
        />
      )}

      {/* Profile drawer */}
      <ProfileDrawer
        studentId={profileId}
        onClose={() => setProfileId(null)}
        onEdit={s => { setProfileId(null); openEdit(s) }}
        isAdmin={isAdmin}
        onNavigateAssign={() => onNavigate?.('assign-incident')}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.first_name} ${deleteTarget?.last_name}?`}
        message="All grades, attendance records, and invoices for this student will also be removed. This cannot be undone."
        confirmLabel="Delete permanently"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
