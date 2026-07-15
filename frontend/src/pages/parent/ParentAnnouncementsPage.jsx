import { useState, useEffect } from 'react'
import api from '../../api/axios'

export default function ParentAnnouncementsPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    api.get('/api/portal/announcements', { params: { search: search || undefined, page, per_page: 15 } })
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load announcements.'))
      .finally(() => setLoading(false))
  }, [search, page])

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Search */}
      <div className="flex gap-3 items-center">
        <input
          type="text" placeholder="Search announcements"
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
        {loading && <span className="text-xs text-slate-400 animate-pulse">Loading...</span>}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Announcement list */}
      {!loading && !error && data?.data?.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-12 text-center">
          <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <p className="text-slate-400 text-sm">No announcements available.</p>
        </div>
      )}

      <div className="space-y-3">
        {data?.data?.map(ann => (
          <div key={ann.id}
            className={`bg-white rounded-2xl border shadow-sm p-5 cursor-pointer transition hover:border-indigo-300 ${selected?.id === ann.id ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'}`}
            onClick={() => setSelected(selected?.id === ann.id ? null : ann)}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{ann.subject}</p>
                <div className="flex items-center gap-2 mt-1">
                  {ann.published_at && (
                    <span className="text-xs text-slate-400">{ann.published_at?.slice(0,10)}</span>
                  )}
                  {ann.audience_type && ann.audience_type !== 'all' && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full capitalize">
                      {ann.audience_type}
                    </span>
                  )}
                  {ann.created_by && (
                    <span className="text-xs text-slate-400">by {ann.created_by.name}</span>
                  )}
                </div>
              </div>
              <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${selected?.id === ann.id ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {selected?.id === ann.id && ann.body && (
              <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600 whitespace-pre-wrap">
                {ann.body}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {data?.last_page > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-xs text-slate-500">Page {data.current_page} of {data.last_page}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50">Previous</button>
            <button disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
