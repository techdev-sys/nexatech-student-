import { useState } from 'react'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { SkeletonTableRows } from '../components/Skeleton'
import {
  useExpenses, useExpenseCategories, useCreateExpense, useUpdateExpense, useDeleteExpense,
  useApproveExpense, useMarkExpensePaid, useCancelExpense,
} from '../modules/finance/hooks'
import { backendMessage } from '../modules/finance/api/financeApi'

const STATUS_BADGE = {
  draft:     'bg-slate-100 text-slate-600',
  approved:  'bg-blue-50 text-blue-700',
  paid:      'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-rose-50 text-rose-600',
}
function money(v) { return Number(v ?? 0).toFixed(2) }
function fmtDate(v) { return v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }

function ExpenseForm({ initial, categories, onClose, onSaved }) {
  const create = useCreateExpense(), update = useUpdateExpense()
  const [form, setForm] = useState({
    expense_category_id: initial?.expense_category_id ?? '',
    expense_date: initial?.expense_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    amount: initial?.amount ?? '', vendor_name: initial?.vendor_name ?? '',
    reference_number: initial?.reference_number ?? '', payment_method: initial?.payment_method ?? '',
    description: initial?.description ?? '',
  })
  const [err, setErr] = useState(null)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (ev) => {
    ev.preventDefault(); setErr(null)
    const payload = { ...form, expense_category_id: Number(form.expense_category_id), amount: Number(form.amount) }
    try {
      if (initial?.id) await update.mutate(initial.id, payload)
      else             await create.mutate(payload)
      onSaved()
    } catch (e) { setErr(backendMessage(e)) }
  }
  const busy = create.loading || update.loading

  return (
    <form onSubmit={submit} className="p-6 space-y-4">
      {err && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{err}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Category *</label>
          <select value={form.expense_category_id} onChange={set('expense_category_id')} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">Select</option>
            {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
          <input type="date" value={form.expense_date} onChange={set('expense_date')} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Amount *</label>
          <input type="number" step="0.01" min="0.01" value={form.amount} onChange={set('amount')} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Vendor</label>
          <input type="text" value={form.vendor_name} onChange={set('vendor_name')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Reference #</label>
          <input type="text" value={form.reference_number} onChange={set('reference_number')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Payment Method</label>
          <input type="text" value={form.payment_method} onChange={set('payment_method')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
        <textarea value={form.description} onChange={set('description')} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
        <button type="submit" disabled={busy} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">{busy ? 'Saving...' : initial?.id ? 'Save' : 'Create'}</button>
      </div>
    </form>
  )
}

export default function ExpensesPage() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal]   = useState(null)
  const [del, setDel]       = useState(null)

  const { data, loading, error, refetch } = useExpenses({ status, search, per_page: 100 })
  const { data: catsRaw } = useExpenseCategories({ per_page: 100, is_active: 1 })
  const categories = catsRaw?.data ?? []
  const expenses = data?.data ?? []

  const approve = useApproveExpense(), markPaid = useMarkExpensePaid(), cancel = useCancelExpense(), remove = useDeleteExpense()

  const onSaved = () => { setModal(null); refetch() }
  const act = async (fn, id) => { try { await fn.mutate(id) } catch {} finally { refetch() } }
  const doDelete = async () => { try { await remove.mutate(del.id) } finally { setDel(null); refetch() } }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="bg-rose-600 rounded-2xl px-6 py-4 text-white flex-1">
          <p className="text-sm text-rose-200 font-medium">Finance</p>
          <h2 className="text-lg font-bold">Expenses</h2>
        </div>
        <button onClick={() => setModal('create')} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shrink-0">+ New Expense</button>
      </div>

      <div className="flex flex-wrap gap-3 bg-slate-50 rounded-xl p-4">
        <select value={status} onChange={e => setStatus(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All statuses</option>
          {['draft', 'approved', 'paid', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendor or reference" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-56" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Date', 'Category', 'Vendor', 'Amount', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? <SkeletonTableRows cols={6} rows={6} />
              : error ? <tr><td colSpan={6} className="py-10 text-center text-sm text-red-600">Failed to load expenses.</td></tr>
              : expenses.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">No expenses recorded.</td></tr>
              : expenses.map((e, i) => (
                <tr key={e.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(e.expense_date)}</td>
                  <td className="px-4 py-3 text-slate-700">{e.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{e.vendor_name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-slate-800">{money(e.amount)}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[e.status]}`}>{e.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {e.status === 'draft' && <>
                        <button onClick={() => setModal(e)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                        <button onClick={() => act(approve, e.id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Approve</button>
                      </>}
                      {e.status === 'approved' && <button onClick={() => act(markPaid, e.id)} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">Mark Paid</button>}
                      {['draft', 'approved'].includes(e.status) && <button onClick={() => act(cancel, e.id)} className="text-xs text-amber-600 hover:text-amber-800 font-medium">Cancel</button>}
                      {e.status !== 'paid' && <button onClick={() => setDel(e)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {modal && <Modal title={modal === 'create' ? 'New Expense' : 'Edit Expense'} onClose={() => setModal(null)} maxWidth="max-w-xl"><ExpenseForm initial={modal === 'create' ? null : modal} categories={categories} onClose={() => setModal(null)} onSaved={onSaved} /></Modal>}
      <ConfirmModal open={!!del} danger title="Delete expense?" message="This expense will be archived (soft-deleted)." confirmLabel="Delete" loading={remove.loading} onConfirm={doDelete} onCancel={() => setDel(null)} />
    </div>
  )
}
