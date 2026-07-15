<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\Grade;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use Illuminate\Http\Request;

class GradeMatrixController extends Controller
{
    public function index(Request $request, SchoolClass $class, Subject $subject)
    {
        $request->validate([
            'term'          => 'required|string',
            'academic_year' => 'required|string|max:9',
        ]);

        $schoolId = $request->user()->school_id;

        abort_if($class->school_id !== $schoolId, 403);
        abort_if($subject->school_id !== $schoolId, 403);

        $assessments = Assessment::where('school_id', $schoolId)
            ->where('subject_id', $subject->id)
            ->where('term', $request->term)
            ->where('academic_year', $request->academic_year)
            ->orderBy('created_at')
            ->get();

        $students = Student::where('school_id', $schoolId)
            ->where('grade_level', $class->grade_level)
            ->when($class->section, fn($q) => $q->where('section', $class->section))
            ->where('status', 'active')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        $assessmentIds = $assessments->pluck('id');
        $studentIds    = $students->pluck('id');

        $grades = Grade::where('school_id', $schoolId)
            ->whereIn('student_id', $studentIds)
            ->whereIn('assessment_id', $assessmentIds)
            ->get()
            ->groupBy('student_id');

        $studentsData = $students->map(function (Student $student) use ($assessments, $grades) {
            $studentGrades = $grades->get($student->id, collect())->keyBy('assessment_id');

            $marks = [];
            foreach ($assessments as $assessment) {
                $grade = $studentGrades->get($assessment->id);
                $marks[(string) $assessment->id] = [
                    'grade_id'       => $grade?->id,
                    'marks_obtained' => $grade ? (float) $grade->score : null,
                    'letter_grade'   => $grade?->grade_letter,
                ];
            }

            return [
                'student_id'       => $student->id,
                'name'             => $student->first_name . ' ' . $student->last_name,
                'admission_number' => $student->student_number,
                'marks'            => $marks,
            ];
        });

        return response()->json([
            'class_name'   => $class->name,
            'subject_name' => $subject->name,
            'term'         => $request->term,
            'academic_year'=> $request->academic_year,
            'assessments'  => $assessments->map(fn($a) => [
                'id'        => $a->id,
                'title'     => $a->name,
                'max_marks' => (float) $a->max_marks,
                'weightage' => (float) $a->weightage,
            ])->values(),
            'students'     => $studentsData->values(),
        ]);
    }
}
