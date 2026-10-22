<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\Grade;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class GradeController extends Controller
{
    public function index(Request $request)
    {
        $grades = Grade::with(['student', 'subject', 'assessment', 'teacher'])
            ->when($request->student_id, fn($q) => $q->where('student_id', $request->student_id))
            ->when($request->subject_id, fn($q) => $q->where('subject_id', $request->subject_id))
            ->when($request->assessment_id, fn($q) => $q->where('assessment_id', $request->assessment_id))
            ->when($request->term, fn($q) => $q->where('term', $request->term))
            ->when($request->academic_year, fn($q) => $q->where('academic_year', $request->academic_year))
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($grades);
    }

    public function store(Request $request)
    {
        $schoolId = $request->user()->school_id;

        $data = $request->validate([
            'student_id'    => ['required', Rule::exists('students',    'id')->where('school_id', $schoolId)],
            'subject_id'    => ['required', Rule::exists('subjects',    'id')->where('school_id', $schoolId)],
            'assessment_id' => ['nullable', Rule::exists('assessments', 'id')->where('school_id', $schoolId)],
            'term'          => 'required|string|max:50',
            'academic_year' => 'nullable|string|max:9',
            'score'         => 'nullable|numeric|min:0',
            'grade_letter'  => 'nullable|string|max:5',
            'remarks'       => 'nullable|string',
        ]);

        $data['teacher_id'] = $request->user()->id;

        if (!empty($data['assessment_id']) && isset($data['score'])) {
            $data = $this->applyBoundary($data, (int) $data['assessment_id'], $request->user()->school_id);
        }

        $grade = Grade::updateOrCreate(
            [
                'school_id'     => $request->user()->school_id,
                'student_id'    => $data['student_id'],
                'subject_id'    => $data['subject_id'],
                'assessment_id' => $data['assessment_id'] ?? null,
                'term'          => $data['term'],
            ],
            $data
        );

        return response()->json($grade->load(['student', 'subject', 'assessment', 'teacher']), 201);
    }

    public function show(Grade $grade)
    {
        return response()->json($grade->load(['student', 'subject', 'assessment', 'teacher']));
    }

    public function update(Request $request, Grade $grade)
    {
        $data = $request->validate([
            'score'        => 'nullable|numeric|min:0',
            'grade_letter' => 'nullable|string|max:5',
            'remarks'      => 'nullable|string',
        ]);

        if (isset($data['score']) && $grade->assessment_id) {
            $data = $this->applyBoundary($data, $grade->assessment_id, $request->user()->school_id);
        }

        $grade->update($data);

        return response()->json($grade->load(['student', 'subject', 'assessment', 'teacher']));
    }

    public function destroy(Grade $grade)
    {
        $grade->delete();
        return response()->json(['message' => 'Grade deleted.']);
    }

    // ── Bulk endpoint ─────────────────────────────────────────────────────────

    public function bulk(Request $request)
    {
        $schoolId = $request->user()->school_id;

        $data = $request->validate([
            'assessment_id'       => ['required', Rule::exists('assessments', 'id')->where('school_id', $schoolId)],
            'grades'              => 'required|array|min:1',
            'grades.*.student_id' => ['required', 'distinct', Rule::exists('students', 'id')->where('school_id', $schoolId)],
            'grades.*.score'      => 'required|numeric|min:0',
        ]);

        $assessment = Assessment::with(['gradingSystem.boundaries'])->findOrFail($data['assessment_id']);
        $schoolId   = $request->user()->school_id;

        // Verify assessment belongs to this tenant
        abort_if($assessment->school_id !== $schoolId, 403);

        $request->validate([
            'grades.*.score' => ['required', 'numeric', 'min:0', 'max:'.$assessment->max_marks],
        ]);

        $gradingSystem = $assessment->effectiveGradingSystem();

        $saved = DB::transaction(function () use ($data, $assessment, $gradingSystem, $schoolId, $request) {
            $results = [];

            foreach ($data['grades'] as $entry) {
                $percentage    = ($entry['score'] / $assessment->max_marks) * 100;
                $weightedScore = ($percentage / 100) * $assessment->weightage;
                $boundary      = $gradingSystem?->resolve($percentage);

                $grade = Grade::updateOrCreate(
                    [
                        'school_id'     => $schoolId,
                        'student_id'    => $entry['student_id'],
                        'subject_id'    => $assessment->subject_id,
                        'assessment_id' => $assessment->id,
                        'term'          => $assessment->term,
                    ],
                    [
                        'academic_year'  => $assessment->academic_year,
                        'teacher_id'     => $request->user()->id,
                        'score'          => $entry['score'],
                        'weighted_score' => round($weightedScore, 2),
                        'grade_letter'   => $boundary?->letter_grade,
                        'remarks'        => $boundary?->label,
                    ]
                );

                $results[] = $grade->load(['student', 'assessment']);
            }

            return $results;
        });

        return response()->json([
            'assessment' => $assessment->only(['id', 'name', 'max_marks', 'weightage', 'term']),
            'count'      => count($saved),
            'grades'     => $saved,
        ], 201);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function applyBoundary(array $data, int $assessmentId, int $schoolId): array
    {
        $assessment    = Assessment::findOrFail($assessmentId);
        $gradingSystem = $assessment->effectiveGradingSystem();

        if (!$gradingSystem) {
            return $data;
        }

        $percentage            = ($data['score'] / $assessment->max_marks) * 100;
        $data['weighted_score'] = round(($percentage / 100) * $assessment->weightage, 2);
        $boundary              = $gradingSystem->resolve($percentage);

        if ($boundary) {
            $data['grade_letter'] = $boundary->letter_grade;
            $data['remarks']      = $boundary->label;
        }

        return $data;
    }
}
