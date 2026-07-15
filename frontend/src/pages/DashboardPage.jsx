import { useState, useEffect } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { SkeletonCard } from '../components/Skeleton'

function StatCard({ label, value, sub, accent = 'default' }) {
  const colors = {
    default: { bg: 'bg-white border-slate-200', val: 'text-slate-800', sub: 'text-slate-400' },
    green:   { bg: 'bg-emerald-50 border-emerald-200', val: 'text-emerald-700', sub: 'text-emerald-500' },
    red:     { bg: 'bg-red-50 border-red-200',         val: 'text-red-700',     sub: 'text-red-400' },
    indigo:  { bg: 'bg-indigo-50 border-indigo-200',   val: 'text-indigo-700',  sub: 'text-indigo-400' },
  }
  const c = colors[accent]
  return (
    <div className={`rounded-xl border ${c.bg} p-5 shadow-sm`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${c.val}`}>{value ?? '—'}</p>
      {sub && <p className={`text-xs mt-1 ${c.sub}`}>{sub}</p>}
    </div>
  )
}

function RecentInvoiceRow({ inv }) {
  const badge = {
    paid:           'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    partially_paid: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    unpaid:         'bg-red-50 text-red-600 ring-1 ring-red-200',
  }
  const label = { paid: 'Paid', partially_paid: 'Partial', unpaid: 'Unpaid' }
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{inv.student_name}</p>
        <p className="text-xs text-slate-400 font-mono">{inv.invoice_number}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-semibold text-slate-700 tabular-nums">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: inv.currency ?? 'USD' }).format(Number(inv.balance_amount))}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge[inv.status]}`}>
          {label[inv.status]}
        </span>
      </div>
    </div>
  )
}

export default function DashboardPage({ onNavigate }) {
  const { user } = useAuth()
  const [billing, setBilling]     = useState(null)
  const [students, setStudents]   = useState(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const reqs = [
      api.get('/api/v1/invoices').catch(() => null),
      api.get('/api/students?per_page=1').catch(() => null),
    ]
    Promise.all(reqs).then(([b, s]) => {
      if (b) setBilling(b.data)
      if (s) setStudents(s.data?.meta?.total ?? s.data?.total ?? null)
      setLoading(false)
    })
  }, [])

  const fmt = (n, curr = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(Number(n ?? 0))

  return (
    <div className="space-y-6">
      {/* Workspace header */}
      <div className="bg-indigo-600 rounded-2xl px-6 py-5 text-white shadow-sm">
        <p className="text-sm font-medium text-indigo-200 mb-0.5">Operational Workspace</p>
        <h2 className="text-xl font-bold">{user?.name}</h2>
        <p className="text-sm text-indigo-200 mt-1">{user?.school?.name} / {user?.role?.replace('_', ' ')}</p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} rows={2} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Students"   value={students ?? '—'} accent="indigo" />
          <StatCard
            label="Total Billed"
            value={billing ? fmt(billing.summary?.total_billed) : '—'}
          />
          <StatCard
            label="Total Collected"
            value={billing ? fmt(billing.summary?.total_paid) : '—'}
            accent="green"
          />
          <StatCard
            label="Outstanding"
            value={billing ? fmt(billing.summary?.outstanding_balance) : '—'}
            accent={Number(billing?.summary?.outstanding_balance) > 0 ? 'red' : 'green'}
          />
        </div>
      )}

      {/* Quick actions + recent invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Operational Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Register Student',       page: 'students',       code: 'REG' },
              { label: 'Record Attendance',   page: 'attendance',     code: 'ATT' },
              { label: 'Enter Marks',      page: 'grading',        code: 'MRK' },
              { label: 'Process Invoices', page: 'billing',        code: 'INV' },
              { label: 'Manage Curriculum',   page: 'subjects',       code: 'CUR' },
            ].map(a => (
              <button
                key={a.page}
                onClick={() => onNavigate(a.page)}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition group"
              >
                <span className="w-9 text-[11px] font-bold text-[#005A9C] uppercase">{a.code}</span>
                <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 transition">
                  {a.label}
                </span>
                <svg className="w-4 h-4 text-slate-300 ml-auto group-hover:text-indigo-400 transition" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Recent invoices */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Recent Invoices</h3>
            <button
              onClick={() => onNavigate('billing')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View All
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : !billing?.invoices?.length ? (
            <p className="text-sm text-slate-400 py-8 text-center">No invoice records available.</p>
          ) : (
            <div>
              {billing.invoices.slice(0, 8).map(inv => (
                <RecentInvoiceRow key={inv.id} inv={inv} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
