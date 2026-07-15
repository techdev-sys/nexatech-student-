import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { usePermissions } from '../hooks/usePermissions'
import { SkeletonTableRows } from '../components/Skeleton'

const STATUS_BADGE = {
  pending:   'bg-slate-100 text-slate-600',
  queued:    'bg-blue-50 text-blue-700',
  sent:      'bg-emerald-50 text-emerald-700',
  delivered: 'bg-green-50 text-green-700',
  failed:    'bg-red-50 text-red-700',
  skipped:   'bg-amber-50 text-amber-700',
}

const CH_BADGE = {
  sms:          'bg-indigo-50 text-indigo-700',
  email:        'bg-sky-50 text-sky-700',
  announcement: 'bg-purple-50 text-purple-700',
}

function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Empty({ msg }) {
  return <p className="text-sm text-slate-400 text-center py-10">{msg}</p>
}

export default function CommunicationDeliveryLogsPage() {
  const { can } = usePermissions()

  const [comms, setComms]           = useState([])
  const [commId, setCommId]         = useState('')
  const [deliveries, setDeliveries] = useState([])
  const [meta, setMeta]             = useState({})
  const [loading, setLoading]       = useState(false)
  const [loadingComms, setLoadingComms] = useState(true)
  const [filters, setFilters]       = useState({ delivery_status: '', channel: '', from_date: '', to_date: '' })
  const [page, setPage]             = useState(1)

  if (!can('view_delivery_logs')) {
    return <div className="py-16 text-center text-slate-400 text-sm">You do not have permission to view delivery logs.</div>
  }

  // Load recent communications for selector
  useEffect(() => {
    setLoadingComms(true)
    api.get('/api/communications', { params: { per_page: 50 } })
      .then(r => setComms(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingComms(false))
  }, [])

  const fetchDeliveries = useCallback(() => {
    if (!commId) return
    setLoading(true)
    const params = { page, per_page: 20 }
    if (filters.delivery_status) params.delivery_status = filters.delivery_status
    if (filters.channel)         params.channel         = filters.channel
    if (filters.from_date)       params.from_date       = filters.from_date
    if (filters.to_date)         params.to_date         = filters.to_date
    api.get(`/api/communications/${commId}/deliveries`, { params })
      .then(r => { setDeliveries(r.data.data); setMeta(r.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [commId, page, filters])

  useEffect(() => { fetchDeliveries() }, [fetchDeliveries])

  const setFilter = k => e => { setFilters(f => ({ ...f, [k]: e.target.value })); setPage(1) }

  const selectedComm = comms.find(c => String(c.id) === String(commId))

  return (
    <div className="space-y-5">
      <div className="bg-slate-700 rounded-2xl px-6 py-4 text-white">
        <p className="text-sm text-slate-300 font-medium">Communication Center</p>
        <h2 className="text-lg font-bold">Delivery Logs</h2>
      </div>

      {/* Communication selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Select Communication</label>
        {loadingComms ? (
          <div className="h-9 bg-slate-100 animate-pulse rounded-lg" />
        ) : (
          <select value={commId} onChange={e => { setCommId(e.target.value); setPage(1) }}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">Select a communication to view deliveries</option>
            {comms.map(c => (
              <option key={c.id} value={c.id}>
                [{c.channel.toUpperCase()}] {c.subject || c.body.slice(0, 50)} · {c.status} · {c.total_recipients} recipients
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Filters */}
      {commId && (
        <div className="flex flex-wrap gap-3 bg-slate-50 rounded-xl p-4">
          <select value={filters.delivery_status} onChange={setFilter('delivery_status')}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">All statuses</option>
            {['pending','queued','sent','delivered','failed','skipped'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.channel} onChange={setFilter('channel')}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">All channels</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </select>
          <input type="date" value={filters.from_date} onChange={setFilter('from_date')}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36" />
          <input type="date" value={filters.to_date} onChange={setFilter('to_date')}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36" />
        </div>
      )}

      {/* Summary strip */}
      {selectedComm && (
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-6 text-sm">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CH_BADGE[selectedComm.channel] ?? 'bg-slate-100 text-slate-600'}`}>{selectedComm.channel}</span>
          <span className="text-slate-600"><span className="font-semibold">{selectedComm.total_recipients}</span> total</span>
          <span className="text-emerald-600"><span className="font-semibold">{selectedComm.successful_deliveries}</span> ok</span>
          <span className="text-red-600"><span className="font-semibold">{selectedComm.failed_deliveries}</span> failed</span>
        </div>
      )}

      {/* Table */}
      {commId ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Recipient', 'Contact', 'Channel', 'Status', 'Error', 'Sent At'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTableRows cols={6} rows={8} />
              ) : deliveries.length === 0 ? (
                <tr><td colSpan={6}><Empty msg="No delivery records found." /></td></tr>
              ) : deliveries.map((d, i) => (
                <tr key={d.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{d.recipient_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {d.recipient_phone && <div>{d.recipient_phone}</div>}
                    {d.recipient_email && <div>{d.recipient_email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CH_BADGE[d.channel] ?? 'bg-slate-100 text-slate-600'}`}>{d.channel}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[d.delivery_status] ?? 'bg-slate-100 text-slate-600'}`}>{d.delivery_status}</span>
                  </td>
                  <td className="px-4 py-3 text-red-600 text-xs max-w-xs truncate" title={d.error_message}>
                    {d.error_message || ''}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(d.sent_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-slate-400 text-sm">
          Select a communication above to view its delivery log.
        </div>
      )}

      {meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Showing {meta.from}–{meta.to} of {meta.total}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Prev</button>
            <button disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
