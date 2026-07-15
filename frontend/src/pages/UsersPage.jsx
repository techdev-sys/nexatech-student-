import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { SkeletonTableRows } from '../components/Skeleton'

const ROLE_BADGE = {
  super_admin: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  admin:       'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  teacher:     'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
  parent:      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
}

const ROLE_TABS = [
  { key: '',        label: 'All' },
  { key: 'admin',   label: 'Admins' },
  { key: 'teacher', label: 'Teachers' },
  { key: 'parent',  label: 'Parents' },
]

const BLANK = { name: '', email: '', password: '', role: 'teacher' }

function UserForm({ initial, currentUserRole, onSave, onClose }) {
  const [form, setForm]     = useState(initial ? { ...initial, password: '' } : BLANK)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const allowedRoles = currentUserRole === 'super_admin'
    ? ['admin', 'teacher', 'parent']
    : ['teacher', 'parent']

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      if (initial?.id) {
        const { data } = await api.patch(`/api/users/${initial.id}`, payload)
        onSave(data, 'updated')
      } else {
        const { data } = await api.post('/api/users', payload)
        onSave(data, 'created')
      }
    } catch (err) {
      setErrors(err.response?.data?.errors ?? { _: err.response?.data?.message ?? 'Failed.' })
    } finally {
      setSaving(false)
    }
  }

  const F = ({ label, k, type = 'text', opt = false }) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}{opt && <span className="text-slate-400 font-normal ml-1">(optional)</span>}
      </label>
      <input type={type} value={form[k]} onChange={set(k)} required={!opt}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors[k] ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
      />
      {errors[k] && <p className="text-xs text-red-500 mt-1">{errors[k][0]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <div className="px-6 py-5 space-y-4">
        <F label="Full name" k="name" />
        <F label="Email address" k="email" type="email" />
        <F label={initial?.id ? 'New password' : 'Password'} k="password" type="password" opt={!!initial?.id} />
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
          <select value={form.role} onChange={set('role')}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            {allowedRoles.map(r => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>
        {errors._ && <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{errors._}</div>}
      </div>
      <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center gap-2">
          {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
          {saving ? 'Saving...' : initial?.id ? 'Save changes' : 'Create user'}
        </button>
      </div>
    </form>
  )
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const toast = useToast()

  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [roleTab, setRoleTab]       = useState('')
  const [modalMode, setModalMode]   = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)

  const fetch = useCallback(() => {
    setLoading(true)
    const params = roleTab ? { role: roleTab } : {}
    api.get('/api/users', { params })
      .then(r => setUsers(r.data))
      .catch(() => toast.error('Failed to load users.'))
      .finally(() => setLoading(false))
  }, [roleTab])

  useEffect(() => { fetch() }, [fetch])

  const handleSaved = (u, mode) => {
    setModalMode(null)
    setEditTarget(null)
    toast.success(`User ${mode}.`)
    fetch()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/users/${deleteTarget.id}`)
      toast.success('User deleted.')
      setDeleteTarget(null)
      fetch()
    } catch { /* interceptor toasts */ } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {ROLE_TABS.map(t => (
            <button key={t.key} onClick={() => setRoleTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${roleTab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setModalMode('add')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New User
        </button>
      </div>

      {/* Info banner for parent workflow */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        <strong>Parent accounts:</strong> Create a parent user here, then go to a student's row and click the link icon to connect them.
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        {loading ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Name','Email','Role','Joined',''].map((h,i) => <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody><SkeletonTableRows cols={5} rows={5} /></tbody>
          </table>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[u.role] ?? 'bg-slate-100 text-slate-500'}`}>
                      {u.role?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => { setEditTarget(u); setModalMode('edit') }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {u.id !== me?.id && !u.role?.includes('super_admin') && (
                        <button onClick={() => setDeleteTarget(u)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(modalMode === 'add' || modalMode === 'edit') && (
        <Modal title={modalMode === 'add' ? 'Create User' : 'Edit User'}
          onClose={() => { setModalMode(null); setEditTarget(null) }}>
          <UserForm
            initial={editTarget}
            currentUserRole={me?.role}
            onSave={handleSaved}
            onClose={() => { setModalMode(null); setEditTarget(null) }}
          />
        </Modal>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={`Remove ${deleteTarget?.name}?`}
        message="Their account and access token will be permanently deleted."
        confirmLabel="Delete user"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
