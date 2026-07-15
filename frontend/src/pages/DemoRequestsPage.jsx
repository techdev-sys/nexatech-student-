import { useEffect, useState } from 'react'
import api from '../api/axios'

const STATUS_CLASS = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-600',
}

function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 uppercase ${STATUS_CLASS[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}

export default function DemoRequestsPage() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/api/v1/platform/demo-requests', { params: { status: status || undefined } })
      .then(r => { setData(r.data); setError('') })
      .catch(e => setError(e.response?.data?.message || 'Could not load demo requests.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [status])

  const review = async (request, action) => {
    setBusy(`${action}-${request.id}`)
    try {
      await api.post(`/api/v1/platform/demo-requests/${request.id}/${action}`)
      load()
    } finally {
      setBusy(null)
    }
  }

  const requests = data?.data ?? []

  return (
    <div className="space-y-4">
      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="bg-white border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 uppercase">Demo Requests</h2>
          <p className="text-xs text-slate-500 mt-1">Approve qualified visitors and issue the demo access code.</p>
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="border border-slate-200 px-3 py-2 text-sm bg-white">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 overflow-x-auto">
        <table>
          <thead>
            <tr>
              {['Institution', 'Contact', 'Role', 'Country', 'Status', 'Access Code', 'Submitted', ''].map(h => (
                <th key={h} className="text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-10 text-center text-slate-400">Loading demo requests...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={8} className="py-10 text-center text-slate-400">No demo request records available.</td></tr>
            ) : requests.map(req => (
              <tr key={req.id}>
                <td className="font-semibold text-slate-800">
                  <div>{req.institution}</div>
                  <div className="text-xs font-normal text-slate-500">{req.name}</div>
                </td>
                <td>
                  <div>{req.email}</div>
                  <div className="text-xs text-slate-500">{req.phone || 'Not supplied'}</div>
                </td>
                <td>{req.role || 'Not supplied'}</td>
                <td>{req.country || 'Not supplied'}</td>
                <td><StatusBadge status={req.status} /></td>
                <td className="font-mono text-xs">{req.access_code || 'Pending approval'}</td>
                <td className="whitespace-nowrap">{req.created_at}</td>
                <td>
                  {req.status === 'pending' ? (
                    <div className="flex justify-end gap-2">
                      <button disabled={busy === `approve-${req.id}`} onClick={() => review(req, 'approve')} className="px-3 py-1.5 bg-[#107C41] text-white text-xs font-bold uppercase disabled:opacity-50">Approve</button>
                      <button disabled={busy === `reject-${req.id}`} onClick={() => review(req, 'reject')} className="px-3 py-1.5 bg-[#A80000] text-white text-xs font-bold uppercase disabled:opacity-50">Reject</button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">Reviewed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
