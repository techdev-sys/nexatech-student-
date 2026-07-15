import { useState } from 'react'
import { useCashbook } from '../modules/finance/hooks'
import { SkeletonTableRows } from '../components/Skeleton'

function money(v) { return Number(v ?? 0).toFixed(2) }
function fmtDate(v) { return v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }

export default function CashbookPage() {
  const [entryType, setEntryType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo]     = useState('')
  const [page, setPage] = useState(1)

  const { data, loading, error } = useCashbook({ entry_type: entryType, from_date: from, to_date: to, page, per_page: 50 })
  const rows = data?.data ?? []

  return (
    <div className="space-y-5">
      <div className="bg-slate-700 rounded-2xl px-6 py-4 text-white">
        <p className="text-sm text-slate-300 font-medium">Finance</p>
        <h2 className="text-lg font-bold">Cashbook</h2>
        <p className="text-sm text-slate-300 mt-0.5">Append-only cash ledger</p>
      </div>

      <div className="flex flex-wrap gap-3 bg-slate-50 rounded-xl p-4">
        <select value={entryType} onChange={e => { setEntryType(e.target.value); setPage(1) }} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All entries</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-40" />
        <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-40" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Date', 'Type', 'Description', 'Income', 'Expense'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? <SkeletonTableRows cols={5} rows={8} />
              : error ? <tr><td colSpan={5} className="py-10 text-center text-sm text-red-600">Failed to load cashbook.</td></tr>
              : rows.length === 0 ? <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">No cashbook entries available.</td></tr>
              : rows.map((r, i) => (
                <tr key={r.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(r.transaction_date)}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full capitalize ${r.entry_type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{r.entry_type}</span></td>
                  <td className="px-4 py-3 text-slate-600 max-w-md truncate">{r.description ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-emerald-700">{r.entry_type === 'income' ? money(r.amount) : ''}</td>
                  <td className="px-4 py-3 font-mono text-rose-600">{r.entry_type === 'expense' ? money(r.amount) : ''}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {data?.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Showing {data.from}–{data.to} of {data.total}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Prev</button>
            <button disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
