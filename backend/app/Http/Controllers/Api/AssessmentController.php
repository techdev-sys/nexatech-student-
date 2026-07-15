<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AssessmentController extends Controller
{
    public function index(Request $request)
    {
        $assessments = Assessment::with(['subject', 'gradingSystem'])
            ->when($request->subject_id,    fn($q) => $q->where('subject_id',    $request->subject_id))
            ->when($request->term,          fn($q) => $q->where('term',          $request->term))
            ->when($request->academic_year, fn($q) => $q->where('academic_year', $request->academic_year))
            ->orderBy('term')
            ->orderBy('name')
            ->get();

        return response()->json($assessments);
    }

    public function store(Request $request)
    {
        $schoolId = $request->user()->school_id;

        $data = $request->validate([
            'subject_id'        => ['required', Rule::exists('subjects',        'id')->where('school_id', $schoolId)],
            'grading_system_id' => ['nullable', Rule::exists('grading_systems', 'id')->where('school_id', $schoolId)],
            'exam_session_id'   => ['nullable', Rule::exists('exam_sessions',   'id')->where('school_id', $schoolId)],
            'name'              => 'required|string|max:100',
            'type'              => 'nullable|in:test,assignment,coursework,exam',
            'academic_year'     => 'required|string|max:9',
            'term'              => 'required|integer|between:1,3',
            'weightage'         => 'required|numeric|min:0|max:100',
            'max_marks'         => 'required|numeric|min:1',
        ]);

        $data['school_id'] = $schoolId;

        $this->assertWeightageCapNotExceeded(
            $schoolId,
            (int) $data['subject_id'],
            (int) $data['term'],
            $data['academic_year'],
            (float) $data['weightage'],
            null
        );

        return response()->json(Assessment::create($data)->load(['subject', 'gradingSystem']), 201);
    }

    public function show(Assessment $assessment)
    {
        return response()->json($assessment->load(['subject', 'gradingSystem', 'grades.student']));
    }

    public function update(Request $request, Assessment $assessment)
    {
        $schoolId = $request->user()->school_id;

        $data = $request->validate([
            'grading_system_id' => ['nullable', Rule::exists('grading_systems', 'id')->where('school_id', $schoolId)],
            'name'              => 'sometimes|string|max:100',
            'weightage'         => 'sometimes|numeric|min:0|max:100',
            'max_marks'         => 'sometimes|numeric|min:1',
        ]);

        if (isset($data['weightage'])) {
            $this->assertWeightageCapNotExceeded(
                $assessment->school_id,
                $assessment->subject_id,
                $assessment->term,
                $assessment->academic_year,
                (float) $data['weightage'],
                $assessment->id
            );
        }

        $assessment->update($data);

        return response()->json($assessment->load(['subject', 'gradingSystem']));
    }

    public function destroy(Assessment $assessment)
    {
        $assessment->delete(); // soft delete — recoverable
        return response()->json(['message' => 'Assessment deleted.']);
    }

    public function restore(int $id, Request $request)
    {
        $assessment = Assessment::withTrashed()
            ->where('id', $id)
            ->where('school_id', $request->user()->school_id)
            ->firstOrFail();

        $assessment->restore();

        return response()->json($assessment->load(['subject', 'gradingSystem']));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Reject if the proposed weightage would push the subject/term/year total above 100%.
     *
     * @param int|null $excludeId  Assessment id to exclude (the one being updated)
     */
    private function assertWeightageCapNotExceeded(
        int    $schoolId,
        int    $subjectId,
        int    $term,
        string $academicYear,
        float  $proposedWeightage,
        ?int   $excludeId
    ): void {
        $existingSum = (float) Assessment::withoutGlobalScope('tenant')
            ->where('school_id',    $schoolId)
            ->where('subject_id',   $subjectId)
            ->where('term',         $term)
            ->where('academic_year',$academicYear)
            ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
            ->whereNull('deleted_at')
            ->sum('weightage');

        $newTotal = round($existingSum + $proposedWeightage, 2);

        if ($newTotal > 100) {
            throw ValidationException::withMessages([
                'weightage' => [
                    "Adding this assessment would make the total weightage {$newTotal}% for this subject/term/year, which exceeds 100%. " .
                    "Current total: {$existingSum}%. Maximum allowed: " . round(100 - $existingSum, 2) . '%.',
                ],
            ]);
        }
    }
}
