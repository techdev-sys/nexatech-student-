<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ResultsDashboardController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'term'          => 'required|integer|between:1,3',
            'academic_year' => 'required|string|max:9',
        ]);

        $schoolId     = $request->user()->school_id;
        $term         = (int) $request->term;
        $academicYear = $request->academic_year;

        // ── Students assessed (have at least one grade this term) ─────────────
        $studentsAssessed = DB::table('grades')
            ->where('school_id', $schoolId)
            ->where('term', $term)
            ->where('academic_year', $academicYear)
            ->whereNull('deleted_at')
            ->distinct('student_id')
            ->count('student_id');

        // ── Exams completed (exam sessions with status=completed) ─────────────
        $examsCompleted = DB::table('exam_sessions')
            ->where('school_id', $schoolId)
            ->where('term', $term)
            ->where('academic_year', $academicYear)
            ->where('status', 'completed')
            ->whereNull('deleted_at')
            ->count();

        // ── Pass rate — derived from grading boundary is_pass flag ───────────
        // Look up the school's default grading system and find which letter grades
        // have is_pass = true. Count grades whose stored grade_letter is in that set.
        // Returns null when no default grading system exists (avoids a meaningless metric).
        $passRate = $this->computePassRate($schoolId, $term, $academicYear);

        // ── Top performing classes (SQL aggregation, no in-memory groupBy) ────
        $classIds = SchoolClass::withoutGlobalScope('tenant')
            ->where('school_id', $schoolId)
            ->pluck('id', 'name');

        $subjectTotals = DB::table('grades')
            ->select('grades.student_id', 'grades.subject_id', DB::raw('SUM(grades.weighted_score) as subject_total'))
            ->where('grades.school_id', $schoolId)
            ->where('grades.term', $term)
            ->where('grades.academic_year', $academicYear)
            ->whereNotNull('grades.weighted_score')
            ->whereNull('grades.deleted_at')
            ->groupBy('grades.student_id', 'grades.subject_id');

        $studentAverages = DB::query()
            ->fromSub($subjectTotals, 'subject_totals')
            ->select('student_id', DB::raw('AVG(subject_total) as student_average'))
            ->groupBy('student_id');

        $topClasses = DB::query()
            ->fromSub($studentAverages, 'student_averages')
            ->join('students', 'student_averages.student_id', '=', 'students.id')
            ->join('classes', function ($join) use ($schoolId) {
                $join->on('students.grade_level', '=', 'classes.grade_level')
                     ->on('students.section', '=', 'classes.section')
                     ->where('classes.school_id', '=', $schoolId);
            })
            ->select('classes.id as class_id', 'classes.name as class_name',
                     DB::raw('AVG(student_averages.student_average) as avg_score'),
                     DB::raw('COUNT(DISTINCT student_averages.student_id) as student_count'))
            ->whereNull('students.deleted_at')
            ->groupBy('classes.id', 'classes.name')
            ->orderByDesc('avg_score')
            ->limit(5)
            ->get();

        // ── Top performing subjects ────────────────────────────────────────────
        $subjectTotalsForRanking = DB::table('grades')
            ->select('grades.student_id', 'grades.subject_id', DB::raw('SUM(grades.weighted_score) as subject_total'))
            ->where('grades.school_id', $schoolId)
            ->where('grades.term', $term)
            ->where('grades.academic_year', $academicYear)
            ->whereNotNull('grades.weighted_score')
            ->whereNull('grades.deleted_at')
            ->groupBy('grades.student_id', 'grades.subject_id');

        $topSubjects = DB::query()
            ->fromSub($subjectTotalsForRanking, 'subject_totals')
            ->join('subjects', 'subject_totals.subject_id', '=', 'subjects.id')
            ->select('subjects.id as subject_id', 'subjects.name as subject_name',
                     DB::raw('AVG(subject_totals.subject_total) as avg_score'),
                     DB::raw('COUNT(DISTINCT subject_totals.student_id) as student_count'))
            ->groupBy('subjects.id', 'subjects.name')
            ->orderByDesc('avg_score')
            ->limit(5)
            ->get();

        return response()->json([
            'term'              => $term,
            'academic_year'     => $academicYear,
            'students_assessed' => $studentsAssessed,
            'exams_completed'   => $examsCompleted,
            'pass_rate'         => $passRate,
            'top_classes'       => $topClasses->map(fn($r) => [
                'class_id'      => $r->class_id,
                'class_name'    => $r->class_name,
                'avg_score'     => round((float) $r->avg_score, 1),
                'student_count' => $r->student_count,
            ])->values(),
            'top_subjects' => $topSubjects->map(fn($r) => [
                'subject_id'    => $r->subject_id,
                'subject_name'  => $r->subject_name,
                'avg_score'     => round((float) $r->avg_score, 1),
                'student_count' => $r->student_count,
            ])->values(),
        ]);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Compute pass rate using the school's default grading system's is_pass flag.
     *
     * grades.grade_letter is stored at entry time using the grading boundary.
     * We look up which letter grades carry is_pass = true and count matching records.
     *
     * Returns null when no default grading system is configured, rather than
     * returning a meaningless metric.
     */
    private function computePassRate(int $schoolId, int $term, string $academicYear): ?float
    {
        $systemId = DB::table('grading_systems')
            ->where('school_id', $schoolId)
            ->where('is_default', true)
            ->value('id');

        if ($systemId === null) {
            return null;
        }

        $passingLetters = DB::table('grade_boundaries')
            ->where('grading_system_id', $systemId)
            ->where('is_pass', true)
            ->pluck('letter_grade')
            ->toArray();

        if (empty($passingLetters)) {
            return null;
        }

        $total = DB::table('grades')
            ->where('school_id',    $schoolId)
            ->where('term',         $term)
            ->where('academic_year', $academicYear)
            ->whereNotNull('grade_letter')
            ->whereNull('deleted_at')
            ->count();

        if ($total === 0) {
            return null;
        }

        $passing = DB::table('grades')
            ->where('school_id',    $schoolId)
            ->where('term',         $term)
            ->where('academic_year', $academicYear)
            ->whereIn('grade_letter', $passingLetters)
            ->whereNull('deleted_at')
            ->count();

        return round(($passing / $total) * 100, 1);
    }
}
