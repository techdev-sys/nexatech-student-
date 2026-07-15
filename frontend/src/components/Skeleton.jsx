// Reusable skeleton primitives — all use animate-pulse

export function SkeletonLine({ w = 'w-full', h = 'h-4' }) {
  return <div className={`${w} ${h} bg-slate-200 rounded animate-pulse`} />
}

export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 animate-pulse">
      <div className="h-3 w-24 bg-slate-200 rounded" />
      <div className="h-8 w-32 bg-slate-200 rounded" />
      {rows > 2 && <div className="h-3 w-40 bg-slate-100 rounded" />}
    </div>
  )
}

export function SkeletonTableRows({ cols = 5, rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className={r % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <div className={`h-4 bg-slate-200 rounded animate-pulse ${c === 1 ? 'w-36' : c === cols - 1 ? 'w-12' : 'w-20'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function SkeletonProfileDrawer() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <div className="h-3 w-20 bg-slate-200 rounded" />
        {[48, 72, 56, 64, 80].map((w, i) => (
          <div key={i} className={`h-4 bg-slate-200 rounded`} style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <div className="h-3 w-24 bg-slate-200 rounded" />
        {[60, 40, 55].map((w, i) => (
          <div key={i} className="h-4 bg-slate-200 rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonRegisterRows({ rows = 8 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
          <td className="px-4 py-2.5"><div className="h-3 w-4 bg-slate-200 rounded animate-pulse" /></td>
          <td className="px-4 py-2.5"><div className="h-4 w-36 bg-slate-200 rounded animate-pulse" /></td>
          {[0,1,2,3].map(j => (
            <td key={j} className="px-2 py-2.5 text-center">
              <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse mx-auto" />
            </td>
          ))}
          <td className="px-4 py-2.5"><div className="h-6 w-full bg-slate-200 rounded animate-pulse" /></td>
        </tr>
      ))}
    </>
  )
}
