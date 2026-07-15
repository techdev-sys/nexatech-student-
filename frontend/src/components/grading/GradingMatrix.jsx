import { useState, useEffect, useCallback } from 'react'
import api from '../../api/axios'
import MatrixFilters from './MatrixFilters'
import DataGrid from './DataGrid'

export default function GradingMatrix({ onSaveStatus }) {
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [term, setTerm] = useState('1')
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()))

  const [matrixData, setMatrixData] = useState(null)
  const [loadingMatrix, setLoadingMatrix] = useState(false)
  const [loadingFilters, setLoadingFilters] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/v1/classes')
      .then((r) => setClasses(r.data))
      .catch(() => setError('Failed to load classes.'))
      .finally(() => setLoadingFilters(false))
  }, [])

  useEffect(() => {
    setSelectedSubject('')
    setSubjects([])
    setMatrixData(null)
    if (!selectedClass) return
    api.get(`/api/v1/classes/${selectedClass}/subjects`)
      .then((r) => setSubjects(r.data))
      .catch(() => setError('Failed to load subjects.'))
  }, [selectedClass])

  useEffect(() => {
    setMatrixData(null)
    if (!selectedClass || !selectedSubject) return
    setLoadingMatrix(true)
    setError('')
    api.get(`/api/v1/classes/${selectedClass}/subjects/${selectedSubject}/grades`, {
      params: { term, academic_year: academicYear },
    })
      .then((r) => setMatrixData(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load grade matrix.'))
      .finally(() => setLoadingMatrix(false))
  }, [selectedClass, selectedSubject, term, academicYear])

  const handleSave = useCallback(async (assessmentId, studentId, score) => {
    onSaveStatus?.('saving')
    try {
      const { data } = await api.post('/api/grades/bulk', {
        assessment_id: assessmentId,
        grades: [{ student_id: studentId, score }],
      })
      const saved = data.grades?.[0]
      if (saved) {
        setMatrixData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            students: prev.students.map((s) =>
              s.student_id !== studentId ? s : {
                ...s,
                marks: {
                  ...s.marks,
                  [String(assessmentId)]: {
                    grade_id:       saved.id,
                    marks_obtained: saved.score,
                    letter_grade:   saved.grade_letter,
                  },
                },
              }
            ),
          }
        })
        onSaveStatus?.('saved')
        return { letter_grade: saved.grade_letter }
      }
    } catch {
      onSaveStatus?.('')
    }
    return null
  }, [onSaveStatus])

  return (
    <div className="space-y-4">
      <MatrixFilters
        classes={classes}
        subjects={subjects}
        selectedClass={selectedClass}
        selectedSubject={selectedSubject}
        term={term}
        academicYear={academicYear}
        onClassChange={setSelectedClass}
        onSubjectChange={setSelectedSubject}
        onTermChange={setTerm}
        onYearChange={setAcademicYear}
        loading={loadingFilters}
      />

      {matrixData && (
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-semibold text-slate-800">
            {matrixData.class_name} — {matrixData.subject_name}
          </h2>
          <span className="text-xs bg-indigo-50 text-indigo-600 font-medium px-2 py-0.5 rounded-full">
            Term {matrixData.term} · {matrixData.academic_year}
          </span>
          <span className="text-xs text-slate-400">
            {matrixData.students.length} students · {matrixData.assessments.length} assessments
          </span>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {loadingMatrix && (
        <div className="text-center py-16 text-slate-400 text-sm">Loading grade matrix...</div>
      )}

      {!loadingMatrix && !matrixData && !error && !selectedSubject && (
        <div className="text-center py-16 text-slate-400 text-sm">
          Select a class and subject above to open the grading matrix.
        </div>
      )}

      {matrixData && matrixData.assessments.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">
          No assessments found for this subject / term / year. Create assessments first.
        </div>
      )}

      {matrixData && matrixData.assessments.length > 0 && (
        <DataGrid
          assessments={matrixData.assessments}
          students={matrixData.students}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
