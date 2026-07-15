import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useParentChild } from '../../context/ParentChildContext'
import PaymentDrawer from '../../components/billing/PaymentDrawer'

const STATUS_BADGE = {
  paid:           'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  partially_paid: 'bg-amber-50   text-amber-700   ring-1 ring-amber-200',
  unpaid:         'bg-red-50     text-red-600     ring-1 ring-red-200',
}
const STATUS_LABEL = { paid: 'Paid', partially_paid: 'Partial', unpaid: 'Unpaid' }

function fmt(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount))
}

export default function ParentFeesPage() {
  const { childId } = useParentChild()
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [page, setPage]             = useState(1)
  const [activeInvoice, setInvoice] = useState(null)
  const [tab, setTab]               = useState('invoices')

  const fetchData = () => {
    if (!childId) return
    setLoading(true)
    setError('')
    api.get(`/api/portal/children/${childId}/fees`, {
      params: { status: statusFilter || undefined, page, per_page: 20 },
    })
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load fees data.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [childId, statusFilter, page])

  const handlePaymentSuccess = () => { setInvoice(null); fetchData() }

  if (!childId) return (
    <div className="text-sm text-slate-500 text-center py-16">No child linked to your account.</div>
  )

  const outstanding = data?.outstanding ?? 0
  const invoices    = data?.invoices?.data ?? []
  const transactions = data?.transactions ?? []
  const currency = invoices[0]?.currency ?? 'USD'

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Outstanding balance banner */}
      {outstanding > 0 ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-red-500 font-medium">Outstanding Balance</p>
            <p className="text-3xl font-bold text-red-700 tabular-nums mt-1">{fmt(outstanding, currency)}</p>
          </div>
          <svg className="w-8 h-8 text-red-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3">
          <svg className="w-6 h-6 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-emerald-700">All fee balances are settled.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        {[['invoices','Invoices'],['payments','Payment History']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`pb-2 text-sm font-medium border-b-2 transition ${tab === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'invoices' && (
        <>
          {/* Filter */}
          <div className="flex gap-3 items-center">
            <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
              value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1) }}>
              <option value="">All Statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partial</option>
              <option value="paid">Paid</option>
            </select>
            {loading && <span className="text-xs text-slate-400 animate-pulse">Loading...</span>}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {invoices.length === 0 && !loading && (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">No invoices found.</p>
            )}
            {invoices.length > 0 && (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <tr>
                    {['Invoice','Term','Total','Paid','Balance','Due','Status',''].map(h => (
                      <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-2 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="px-4 py-2 text-slate-600">
                        {inv.term ? `Term ${inv.term} ${inv.academic_year ?? ''}` : '—'}
                      </td>
                      <td className="px-4 py-2 tabular-nums">{fmt(inv.total_amount, inv.currency)}</td>
                      <td className="px-4 py-2 tabular-nums text-emerald-600">{fmt(inv.paid_amount, inv.currency)}</td>
                      <td className="px-4 py-2 tabular-nums font-semibold">{fmt(inv.balance_amount, inv.currency)}</td>
                      <td className="px-4 py-2 text-slate-500 text-xs">{inv.due_date}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[inv.status]}`}>
                          {STATUS_LABEL[inv.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {inv.status !== 'paid' && (
                          <button onClick={() => setInvoice({ ...inv, currency: inv.currency ?? 'USD' })}
                            className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition">
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {data?.invoices?.last_page > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Page {data.invoices.current_page} of {data.invoices.last_page}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1 rounded-lg border border-slate-200 text-xs disabled:opacity-40">Prev</button>
                  <button disabled={page >= data.invoices.last_page} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 rounded-lg border border-slate-200 text-xs disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'payments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {transactions.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">No payment transactions recorded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  {['Date','Invoice','Amount','Method','Status'].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-2 text-xs">{tx.created_at?.slice(0,10)}</td>
                    <td className="px-4 py-2 font-mono text-xs">{tx.invoice_number}</td>
                    <td className="px-4 py-2 tabular-nums font-semibold text-emerald-700">{fmt(tx.amount, currency)}</td>
                    <td className="px-4 py-2 text-slate-600 capitalize">{tx.payment_method ?? '—'}</td>
                    <td className="px-4 py-2 text-xs capitalize">{tx.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <PaymentDrawer invoice={activeInvoice} mode="pay"
        onClose={() => setInvoice(null)} onSuccess={handlePaymentSuccess} />
    </div>
  )
}
