<?php

namespace App\Services;

use App\Models\Grade;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Support\Facades\DB;

/**
 * Server-side result processing engine.
 *
 * All aggregation is done in SQL — no large in-memory collections.
 * Rankings use DENSE_RANK semantics: tied students share a position,
 * and the next rank is sequential (e.g. 1, 1, 2, 3).
 */
class AcademicResultService
{
    /**
     * Compute class rankings for a given grade_level+section+term+year.
     *
     * Returns an array keyed by student_id:
     *   [ student_id => ['class_position' => int, 'class_size' => int, 'overall_average' => float] ]
     */
    public function classRankings(
        int    $schoolId,
        string $gradeLevel,
        ?string $section,
        int    $term,
        string $academicYear
    ): array {
        // Get all active students in this class
        $studentIds = Student::withoutGlobalScope('tenant')
            ->where('school_id', $schoolId)
            ->where('grade_level', $gradeLevel)
            ->when($section, fn($q) => $q->where('section', $section))
            ->where('status', 'active')
            ->pluck('id')
            ->toArray();

        if (empty($studentIds)) {
            return [];
        }

        // Average the final subject percentages, not each assessment component.
        $subjectTotals = DB::table('grades')
            ->select('student_id', 'subject_id', DB::raw('SUM(weighted_score) as subject_total'))
            ->where('school_id', $schoolId)
            ->where('term', $term)
            ->where('academic_year', $academicYear)
            ->whereIn('student_id', $studentIds)
            ->whereNotNull('weighted_score')
            ->whereNull('deleted_at')
            ->groupBy('student_id', 'subject_id');

        $rows = DB::query()
            ->fromSub($subjectTotals, 'subject_totals')
            ->select('student_id', DB::raw('AVG(subject_total) as avg_score'))
            ->groupBy('student_id')
            ->orderByDesc('avg_score')
            ->get();

        $classSize = count($studentIds);
        $rankings  = [];

        // DENSE_RANK: same score → same position; next distinct score → position+1
        $position = 0;
        $lastAvg  = null;

        foreach ($rows as $row) {
            $avg = round((float) $row->avg_score, 2);

            if ($avg !== $lastAvg) {
                $position++;
                $lastAvg = $avg;
            }

            $rankings[$row->student_id] = [
                'class_position'  => $position,
                'class_size'      => $classSize,
                'overall_average' => $avg,
            ];
        }

        // Students with no grades are absent from the result set (no rank)
        return $rankings;
    }

    /**
     * Compute subject rankings: for a specific subject+term+year, rank all
     * students in the given class by their weighted score on that subject.
     *
     * Returns an array keyed by student_id:
     *   [ student_id => ['subject_position' => int, 'subject_class_size' => int] ]
     */
    public function subjectRankings(
        int    $schoolId,
        int    $subjectId,
        string $gradeLevel,
        ?string $section,
        int    $term,
        string $academicYear
    ): array {
        $studentIds = Student::withoutGlobalScope('tenant')
            ->where('school_id', $schoolId)
            ->where('grade_level', $gradeLevel)
            ->when($section, fn($q) => $q->where('section', $section))
            ->where('status', 'active')
            ->pluck('id')
            ->toArray();

        if (empty($studentIds)) {
            return [];
        }

        $rows = DB::table('grades')
            ->select('student_id', DB::raw('SUM(weighted_score) as total_weighted'))
            ->where('school_id', $schoolId)
            ->where('subject_id', $subjectId)
            ->where('term', $term)
            ->where('academic_year', $academicYear)
            ->whereIn('student_id', $studentIds)
            ->whereNotNull('weighted_score')
            ->whereNull('deleted_at')
            ->groupBy('student_id')
            ->orderByDesc('total_weighted')
            ->get();

        $classSize = count($studentIds);
        $rankings  = [];
        $position  = 0;
        $lastScore = null;

        foreach ($rows as $row) {
            $score = round((float) $row->total_weighted, 2);

            if ($score !== $lastScore) {
                $position++;
                $lastScore = $score;
            }

            $rankings[$row->student_id] = [
                'subject_position'   => $position,
                'subject_class_size' => $classSize,
            ];
        }

        return $rankings;
    }

    /**
     * Get a single student's class position.
     * Thin wrapper around classRankings() for single-student lookups.
     */
    public function studentClassPosition(
        int    $studentId,
        int    $schoolId,
        string $gradeLevel,
        ?string $section,
        int    $term,
        string $academicYear
    ): ?array {
        $rankings = $this->classRankings($schoolId, $gradeLevel, $section, $term, $academicYear);
        return $rankings[$studentId] ?? null;
    }

    /**
     * Class results: return aggregated per-student averages for a class.
     * Used by the class results page.
     */
    public function classResults(
        int    $schoolId,
        int    $classId,
        int    $term,
        string $academicYear
    ): array {
        $class = SchoolClass::withoutGlobalScope('tenant')
            ->where('id', $classId)
            ->where('school_id', $schoolId)
            ->firstOrFail();

        $rankings = $this->classRankings(
            $schoolId, $class->grade_level, $class->section, $term, $academicYear
        );

        $studentIds = array_keys($rankings);
        if (empty($studentIds)) {
            return [];
        }

        $students = Student::withoutGlobalScope('tenant')
            ->whereIn('id', $studentIds)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'student_number']);

        return $students->map(function ($student) use ($rankings) {
            $r = $rankings[$student->id] ?? [];
            return [
                'student_id'      => $student->id,
                'name'            => $student->first_name . ' ' . $student->last_name,
                'student_number'  => $student->student_number,
                'overall_average' => $r['overall_average'] ?? null,
                'class_position'  => $r['class_position'] ?? null,
                'class_size'      => $r['class_size'] ?? null,
            ];
        })->sortBy('class_position')->values()->toArray();
    }
}
