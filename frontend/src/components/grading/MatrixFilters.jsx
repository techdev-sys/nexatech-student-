export default function MatrixFilters({
  classes,
  subjects,
  selectedClass,
  selectedSubject,
  term,
  academicYear,
  onClassChange,
  onSubjectChange,
  onTermChange,
  onYearChange,
  loading,
}) {
  return (
    <div className="flex flex-wrap gap-3 items-end bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Class</label>
        <select
          value={selectedClass}
          onChange={(e) => onClassChange(e.target.value)}
          disabled={loading}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-[160px]"
        >
          <option value="">Select class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Subject</label>
        <select
          value={selectedSubject}
          onChange={(e) => onSubjectChange(e.target.value)}
          disabled={!selectedClass || loading}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-[160px] disabled:opacity-50"
        >
          <option value="">Select subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Term</label>
        <select
          value={term}
          onChange={(e) => onTermChange(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          <option value="1">Term 1</option>
          <option value="2">Term 2</option>
          <option value="3">Term 3</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Year</label>
        <input
          type="number"
          value={academicYear}
          onChange={(e) => onYearChange(e.target.value)}
          min={2020}
          max={2099}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white w-24"
        />
      </div>
    </div>
  )
}
