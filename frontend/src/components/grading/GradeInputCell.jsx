import { useState, useRef, useEffect, memo } from 'react'

const GradeInputCell = memo(function GradeInputCell({
  studentId,
  assessmentId,
  gradeId,
  initialValue,
  maxMarks,
  letterGrade,
  onSave,
  inputRef,
}) {
  const [localValue, setLocalValue] = useState(
    initialValue !== null && initialValue !== undefined ? String(initialValue) : ''
  )
  const [saving, setSaving] = useState(false)
  const [letter, setLetter] = useState(letterGrade ?? '')
  const dirtyRef = useRef(false)

  // Sync if parent pushes a new initialValue (after a save resolves)
  useEffect(() => {
    setLocalValue(initialValue !== null && initialValue !== undefined ? String(initialValue) : '')
    setLetter(letterGrade ?? '')
  }, [initialValue, letterGrade])

  const commit = async () => {
    if (!dirtyRef.current) return
    dirtyRef.current = false

    const numVal = parseFloat(localValue)
    if (localValue.trim() === '' || isNaN(numVal)) return
    if (numVal < 0 || numVal > maxMarks) return

    setSaving(true)
    try {
      const updated = await onSave(assessmentId, studentId, numVal)
      if (updated?.letter_grade) setLetter(updated.letter_grade)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    dirtyRef.current = true
    setLocalValue(e.target.value)
  }

  const handleBlur = () => commit()

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
      // Move focus down one row (same column) via dataset
      const cell = e.target.closest('td')
      const row = cell?.parentElement
      const colIdx = Array.from(row?.cells ?? []).indexOf(cell)
      const nextRow = row?.nextElementSibling
      if (nextRow) {
        const nextCell = nextRow.cells[colIdx]
        nextCell?.querySelector('input')?.focus()
      }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const cell = e.target.closest('td')
      const row = cell?.parentElement
      const colIdx = Array.from(row?.cells ?? []).indexOf(cell)
      const nextRow = row?.nextElementSibling
      nextRow?.cells[colIdx]?.querySelector('input')?.focus()
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const cell = e.target.closest('td')
      const row = cell?.parentElement
      const colIdx = Array.from(row?.cells ?? []).indexOf(cell)
      const prevRow = row?.previousElementSibling
      prevRow?.cells[colIdx]?.querySelector('input')?.focus()
    }
  }

  const isOver = parseFloat(localValue) > maxMarks
  const isEmpty = localValue.trim() === ''

  return (
    <div className="flex items-center gap-1 min-w-[80px]">
      <input
        ref={inputRef}
        type="number"
        min={0}
        max={maxMarks}
        step="0.5"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="—"
        className={[
          'w-16 text-center text-sm rounded border px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400',
          isOver ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white',
          saving ? 'opacity-50' : '',
        ].join(' ')}
      />
      {!isEmpty && letter && (
        <span className={[
          'text-xs font-bold w-6 text-center rounded',
          letter === 'A' ? 'text-emerald-600' :
          letter === 'B' ? 'text-blue-600' :
          letter === 'C' ? 'text-yellow-600' :
          letter === 'D' ? 'text-orange-500' : 'text-red-500',
        ].join(' ')}>
          {letter}
        </span>
      )}
    </div>
  )
})

export default GradeInputCell
