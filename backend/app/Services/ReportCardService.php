<?php

namespace App\Services;

use App\Models\Assessment;
use App\Models\ExamSession;
use App\Models\Grade;
use App\Models\GradingSystem;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\Subject;
use Illuminate\Support\Facades\DB;

class ReportCardService
{
    public function __construct(private AcademicResultService $resultService) {}

    /**
     * Compile a full term report card for a student, including academics,
     * attendance, behaviour summary, finance status, and class/subject positions.
     *
     * @return array{student: array, school: array, term: int, academic_year: string,
     *               subjects: array, summary: array, position: array,
     *               attendance: array, behaviour: array, finance: array, compiled_at: string}
     */
    public function compile(int $studentId, int $term, string $academicYear, int $schoolId): array
    {
        $student = Student::withoutGlobalScope('tenant')
            ->with('school')
            ->where('id', $studentId)
            ->where('school_id', $schoolId)
            ->firstOrFail();

        $defaultSystem = GradingSystem::withoutGlobalScope('tenant')
            ->where('school_id', $schoolId)
            ->where('is_default', true)
            ->with('boundaries')
            ->first();

        $subjects = Subject::withoutGlobalScope('tenant')
            ->where('school_id', $schoolId)
            ->where('grade_level', $student->grade_level)
            ->get();

        $subjectIds  = $subjects->pluck('id');
        $assessments = Assessment::withoutGlobalScope('tenant')
            ->whereIn('subject_id', $subjectIds)
            ->where('school_id', $schoolId)
            ->where('term', $term)
            ->where('academic_year', $academicYear)
            ->with(['gradingSystem.boundaries'])
            ->get()
            ->groupBy('subject_id');

        $grades = Grade::withoutGlobalScope('tenant')
            ->where('student_id', $studentId)
            ->where('school_id', $schoolId)
            ->where('term', (string) $term)
            ->where('academic_year', $academicYear)
            ->get()
            ->keyBy('assessment_id');

        // ── Subject rankings (server-side) ────────────────────────────────────
        $subjectRankingsCache = [];

        $compiledSubjects = $subjects->map(function (Subject $subject) use (
            $assessments, $grades, $defaultSystem, $schoolId, $term, $academicYear,
            $student, $studentId, &$subjectRankingsCache
        ) {
            $subjectAssessments = $assessments->get($subject->id, collect());

            $breakdown = $subjectAssessments->map(function (Assessment $assessment) use ($grades) {
                $grade  = $grades->get($assessment->id);
                $score  = $grade ? (float) $grade->score : null;

                $weighted = null;
                if ($score !== null) {
                    $weighted = $grade->weighted_score !== null
                        ? (float) $grade->weighted_score
                        : round(($score / $assessment->max_marks) * $assessment->weightage, 2);
                }

                return [
                    'assessment'     => $assessment->name,
                    'type'           => $assessment->type ?? 'test',
                    'max_marks'      => (float) $assessment->max_marks,
                    'weightage'      => (float) $assessment->weightage,
                    'score'          => $score,
                    'weighted_score' => $weighted,
                ];
            })->values();

            $terminalPercentage = $breakdown->sum('weighted_score');
            $system             = $subjectAssessments->first()?->gradingSystem ?? $defaultSystem;
            $boundary           = $system?->resolve($terminalPercentage);

            // Subject ranking — computed via SQL in AcademicResultService
            if (!isset($subjectRankingsCache[$subject->id])) {
                $subjectRankingsCache[$subject->id] = $this->resultService->subjectRankings(
                    $schoolId, $subject->id, $student->grade_level, $student->section,
                    $term, $academicYear
                );
            }
            $subjectRank = $subjectRankingsCache[$subject->id][$studentId] ?? null;

            return [
                'subject'             => ['id' => $subject->id, 'name' => $subject->name, 'code' => $subject->code],
                'assessments'         => $breakdown,
                'terminal_percentage' => round($terminalPercentage, 2),
                'terminal_letter'     => $boundary?->letter_grade ?? '—',
                'terminal_label'      => $boundary?->label ?? 'No grade',
                'is_pass'             => $boundary?->is_pass ?? false,
                'points'              => $boundary?->points,
                'subject_position'    => $subjectRank['subject_position'] ?? null,
                'subject_class_size'  => $subjectRank['subject_class_size'] ?? null,
            ];
        })->values();

        $attempted = $compiledSubjects->filter(fn($s) => $s['terminal_percentage'] > 0);
        $passed    = $attempted->filter(fn($s) => $s['is_pass']);
        $average   = $attempted->count() > 0
            ? round($attempted->avg('terminal_percentage'), 2)
            : 0;

        $overallBoundary = $defaultSystem?->resolve($average);

        // ── Class position ────────────────────────────────────────────────────
        $classRankData = $this->resultService->studentClassPosition(
            $studentId, $schoolId, $student->grade_level, $student->section,
            $term, $academicYear
        );

        // ── Resolve term date range from ExamSession ──────────────────────────
        // The attendance table has a `date` column but no term/year column.
        // We scope attendance to the session's start_date..end_date when one exists.
        // Prefer completed sessions over active; fall back to no date filter if absent.
        $examSession = ExamSession::withoutGlobalScope('tenant')
            ->where('school_id',     $schoolId)
            ->where('term',          $term)
            ->where('academic_year', $academicYear)
            ->whereIn('status', ['completed', 'active'])
            ->whereNotNull('start_date')
            ->whereNotNull('end_date')
            ->orderByRaw("CASE status WHEN 'completed' THEN 0 ELSE 1 END")
            ->first();

        // ── Attendance summary ────────────────────────────────────────────────
        $attendanceSummary = $this->compileAttendance(
            $studentId,
            $schoolId,
            $examSession?->start_date?->toDateString(),
            $examSession?->end_date?->toDateString()
        );

        // ── Behaviour summary ─────────────────────────────────────────────────
        $behaviourSummary = $this->compileBehaviour($studentId, $schoolId, $term, $academicYear);

        // ── Finance summary ───────────────────────────────────────────────────
        $financeSummary = $this->compileFinance($studentId, $schoolId);

        return [
            'student' => [
                'id'             => $student->id,
                'name'           => $student->first_name . ' ' . $student->last_name,
                'student_number' => $student->student_number,
                'grade_level'    => $student->grade_level,
                'section'        => $student->section,
            ],
            'school' => [
                'id'   => $student->school->id,
                'name' => $student->school->name,
                'logo' => $student->school->logo ?? null,
            ],
            'term'          => $term,
            'academic_year' => $academicYear,
            'subjects'      => $compiledSubjects->toArray(),
            'summary' => [
                'total_subjects'     => $compiledSubjects->count(),
                'subjects_attempted' => $attempted->count(),
                'subjects_passed'    => $passed->count(),
                'subjects_failed'    => $attempted->count() - $passed->count(),
                'overall_average'    => $average,
                'overall_letter'     => $overallBoundary?->letter_grade ?? '—',
                'overall_label'      => $overallBoundary?->label ?? '—',
                'total_points'       => $attempted->sum('points'),
            ],
            'position' => [
                'class_position' => $classRankData['class_position'] ?? null,
                'class_size'     => $classRankData['class_size'] ?? null,
            ],
            'attendance' => $attendanceSummary,
            'behaviour'  => $behaviourSummary,
            'finance'    => $financeSummary,
            'compiled_at' => now()->toIso8601String(),
        ];
    }

    // ── Private section compilers ─────────────────────────────────────────────

    /**
     * @param string|null $dateFrom  Inclusive start date (Y-m-d). Null = no lower bound.
     * @param string|null $dateTo    Inclusive end date (Y-m-d).   Null = no upper bound.
     */
    private function compileAttendance(
        int     $studentId,
        int     $schoolId,
        ?string $dateFrom,
        ?string $dateTo
    ): array {
        $rows = DB::table('attendance')
            ->select('status', DB::raw('COUNT(*) as cnt'))
            ->where('school_id',  $schoolId)
            ->where('student_id', $studentId)
            ->when(
                $dateFrom !== null && $dateTo !== null,
                fn($q) => $q->whereBetween('date', [$dateFrom, $dateTo])
            )
            ->whereNull('deleted_at')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        return [
            'present'     => (int) ($rows['present']->cnt ?? 0),
            'absent'      => (int) ($rows['absent']->cnt ?? 0),
            'late'        => (int) ($rows['late']->cnt ?? 0),
            'excused'     => (int) ($rows['excused']->cnt ?? 0),
            'total'       => $rows->sum('cnt'),
            'period_from' => $dateFrom,
            'period_to'   => $dateTo,
        ];
    }

    private function compileBehaviour(int $studentId, int $schoolId, int $term, string $academicYear): array
    {
        $total = DB::table('behaviour_incidents')
            ->where('school_id', $schoolId)
            ->where('student_id', $studentId)
            ->whereNull('deleted_at')
            ->count();

        $severe = DB::table('behaviour_incidents')
            ->join('behaviour_incident_types', 'behaviour_incidents.incident_type_id', '=', 'behaviour_incident_types.id')
            ->where('behaviour_incidents.school_id', $schoolId)
            ->where('behaviour_incidents.student_id', $studentId)
            ->whereNull('behaviour_incidents.deleted_at')
            ->where('behaviour_incident_types.severity', 'major')
            ->count();

        $standing = match (true) {
            $total === 0               => 'Excellent',
            $severe === 0 && $total < 3 => 'Good',
            $severe < 2                => 'Satisfactory',
            default                    => 'Needs Improvement',
        };

        return [
            'total_incidents'  => $total,
            'major_incidents'  => $severe,
            'standing'         => $standing,
        ];
    }

    private function compileFinance(int $studentId, int $schoolId): array
    {
        $row = DB::table('invoices')
            ->select([
                DB::raw('COALESCE(SUM(total_amount), 0) as total_billed'),
                DB::raw('COALESCE(SUM(paid_amount), 0) as total_paid'),
                DB::raw('COALESCE(SUM(balance_amount), 0) as outstanding'),
            ])
            ->where('school_id', $schoolId)
            ->where('student_id', $studentId)
            ->whereNull('deleted_at')
            ->first();

        $outstanding = (float) ($row->outstanding ?? 0);
        $feeStatus   = $outstanding <= 0 ? 'Fully Paid' : 'Outstanding';

        return [
            'total_billed'  => (float) ($row->total_billed ?? 0),
            'total_paid'    => (float) ($row->total_paid ?? 0),
            'outstanding'   => $outstanding,
            'fee_status'    => $feeStatus,
        ];
    }
}
