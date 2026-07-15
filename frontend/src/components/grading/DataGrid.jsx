import GradeInputCell from './GradeInputCell'

export default function DataGrid({ assessments, students, onSave }) {
  if (!students.length) {
    return (
      <div className="text-center py-16 text-slate-400 text-sm">
        No students found for this class.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap w-8">
              #
            </th>
            <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap min-w-[180px]">
              Student
            </th>
            <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs whitespace-nowrap">
              Adm. No.
            </th>
            {assessments.map((a) => (
              <th key={a.id} className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap min-w-[110px]">
                <div>{a.title}</div>
                <div className="text-xs font-normal text-slate-400">
                  {a.max_marks} marks · {a.weightage}%
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student, rowIdx) => (
            <tr
              key={student.student_id}
              className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
            >
              <td className="px-4 py-2 text-slate-400 text-xs">{rowIdx + 1}</td>
              <td className="px-4 py-2 font-medium text-slate-800 whitespace-nowrap">
                {student.name}
              </td>
              <td className="px-4 py-2 text-slate-400 text-xs whitespace-nowrap">
                {student.admission_number}
              </td>
              {assessments.map((a) => {
                const mark = student.marks?.[String(a.id)]
                return (
                  <td key={a.id} className="px-3 py-2">
                    <GradeInputCell
                      studentId={student.student_id}
                      assessmentId={a.id}
                      gradeId={mark?.grade_id ?? null}
                      initialValue={mark?.marks_obtained ?? null}
                      letterGrade={mark?.letter_grade ?? null}
                      maxMarks={a.max_marks}
                      onSave={onSave}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
