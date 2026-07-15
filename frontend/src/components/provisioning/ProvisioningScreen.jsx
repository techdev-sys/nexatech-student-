import { useState, useEffect } from 'react'
import api from '../../api/axios'
import NewSchoolModal from './NewSchoolModal'

function StatCard({ label, value, accent }) {
  const colors = {
    default: 'text-slate-800',
    green:   'text-emerald-600',
    slate:   'text-slate-500',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${colors[accent ?? 'default']}`}>{value}</p>
    </div>
  )
}

function SchoolCard({ school, onToggle, toggling }) {
  return (
    <div className={[
      'bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-3 transition',
      school.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60',
    ].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-slate-800 truncate">{school.name}</h3>
            <span className={[
              'text-xs font-medium px-2 py-0.5 rounded-full shrink-0',
              school.is_active
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
            ].join(' ')}>
              {school.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5 truncate">{school.email}</p>
          {school.address && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{school.address}</p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
          {school.name.slice(0, 2).toUpperCase()}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-slate-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span><strong className="text-slate-700">{school.students_count}</strong> students</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span><strong className="text-slate-700">{school.users_count}</strong> staff</span>
        </div>
        <span className="text-slate-300">·</span>
        <span className="text-xs text-slate-400">Since {school.created_at}</span>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => onToggle(school)}
        disabled={toggling === school.id}
        className={[
          'w-full py-2 text-xs font-semibold rounded-lg border transition disabled:opacity-50',
          school.is_active
            ? 'border-red-200 text-red-600 hover:bg-red-50'
            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
        ].join(' ')}
      >
        {toggling === school.id
          ? 'Updating...'
          : school.is_active ? 'Deactivate school' : 'Reactivate school'}
      </button>
    </div>
  )
}

export default function ProvisioningScreen() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [toggling, setToggling] = useState(null)
  const [search, setSearch]     = useState('')

  const fetchData = () => {
    setLoading(true)
    api.get('/api/v1/platform/schools')
      .then(r => { setData(r.data); setError('') })
      .catch(e => setError(e.response?.data?.message || 'Failed to load schools.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleCreated = () => {
    setShowModal(false)
    fetchData()
  }

  const handleToggle = async (school) => {
    setToggling(school.id)
    try {
      const { data: updated } = await api.patch(`/api/v1/platform/schools/${school.id}/toggle-active`)
      setData(prev => ({
        ...prev,
        active:  updated.is_active ? prev.active + 1 : prev.active - 1,
        schools: prev.schools.map(s => s.id === updated.id ? { ...s, is_active: updated.is_active } : s),
      }))
    } finally {
      setToggling(null)
    }
  }

  const filtered = (data?.schools ?? []).filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
      )}

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total schools"  value={data.total}              />
          <StatCard label="Active"         value={data.active}             accent="green" />
          <StatCard label="Inactive"       value={data.total - data.active} accent="slate" />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Search by name or email"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white w-64"
        />
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New School
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-slate-400 text-sm">Loading schools...</div>
      )}

      {/* School cards grid */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">
          {search ? 'No schools match your search.' : 'No institution records available.'}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(school => (
            <SchoolCard
              key={school.id}
              school={school}
              onToggle={handleToggle}
              toggling={toggling}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NewSchoolModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
