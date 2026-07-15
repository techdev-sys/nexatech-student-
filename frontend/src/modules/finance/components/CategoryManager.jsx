import { useState } from 'react'
import Modal from '../../../components/Modal'
import ConfirmModal from '../../../components/ConfirmModal'
import { SkeletonTableRows } from '../../../components/Skeleton'
import { backendMessage } from '../api/financeApi'

// Reusable category CRUD UI shared by Income and Expense category pages.
function CategoryForm({ initial, onClose, onSaved, create, update }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '', code: initial?.code ?? '',
    description: initial?.description ?? '', is_active: initial?.is_active ?? true,
  })
  const [err, setErr] = useState(null)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (ev) => {
    ev.preventDefault(); setErr(null)
    try {
      if (initial?.id) await update.mutate(initial.id, form)
      else             await create.mutate(form)
      onSaved()
    } catch (e) { setErr(backendMessage(e)) }
  }
  const busy = create.loading || update.loading

  return (
    <form onSubmit={submit} className="p-6 space-y-4">
      {err && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{err}</div>}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
        <input type="text" value={form.name} onChange={set('name')} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
        <input type="text" value={form.code} onChange={set('code')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
        <textarea value={form.description} onChange={set('description')} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.is_active} onChange={set('is_active')} className="rounded text-indigo-600" /> Active</label>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
        <button type="submit" disabled={busy} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">{busy ? 'Saving...' : initial?.id ? 'Save' : 'Create'}</button>
      </div>
    </form>
  )
}

export default function CategoryManager({ title, accent, useList, useCreate, useUpdate, useDelete }) {
  const [search, setSearch] = useState('')
  const [modal, setModal]   = useState(null)
  const [del, setDel]       = useState(null)
  const create = useCreate(), update = useUpdate(), remove = useDelete()
  const { data, loading, error, refetch } = useList({ search, per_page: 100 })
  const rows = data?.data ?? []

  const onSaved = () => { setModal(null); refetch() }
  const doDelete = async () => { try { await remove.mutate(del.id) } finally { setDel(null); refetch() } }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className={`${accent} rounded-2xl px-6 py-4 text-white flex-1`}>
          <p className="text-sm text-white/70 font-medium">Finance</p>
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        <button onClick={() => setModal('create')} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shrink-0">+ New</button>
      </div>

      <div className="bg-slate-50 rounded-xl p-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-56" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Name', 'Code', 'Description', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? <SkeletonTableRows cols={5} rows={6} />
              : error ? <tr><td colSpan={5} className="py-10 text-center text-sm text-red-600">Failed to load.</td></tr>
              : rows.length === 0 ? <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">No category records available.</td></tr>
              : rows.map((c, i) => (
                <tr key={c.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500">{c.code ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{c.description ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => setModal(c)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit</button><button onClick={() => setDel(c)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button></div></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {modal && <Modal title={modal === 'create' ? `New ${title}` : `Edit ${title}`} onClose={() => setModal(null)}><CategoryForm initial={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSaved={onSaved} create={create} update={update} /></Modal>}
      <ConfirmModal open={!!del} danger title="Delete category?" message={`"${del?.name}" will be archived (soft-deleted).`} confirmLabel="Delete" loading={remove.loading} onConfirm={doDelete} onCancel={() => setDel(null)} />
    </div>
  )
}
