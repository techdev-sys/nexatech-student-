<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\ExamSession;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExamSessionController extends Controller
{
    public function index(Request $request)
    {
        $sessions = ExamSession::query()
            ->when($request->academic_year, fn($q) => $q->where('academic_year', $request->academic_year))
            ->when($request->term,          fn($q) => $q->where('term', $request->term))
            ->when($request->status,        fn($q) => $q->where('status', $request->status))
            ->orderBy('start_date', 'desc')
            ->get();

        return response()->json($sessions);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'          => 'required|string|max:150',
            'academic_year' => 'required|string|max:9',
            'term'          => 'required|integer|between:1,3',
            'start_date'    => 'required|date',
            'end_date'      => 'required|date|after_or_equal:start_date',
            'status'        => 'nullable|in:draft,active,completed,archived',
            'description'   => 'nullable|string|max:1000',
        ]);

        $data['school_id'] = $request->user()->school_id;
        $data['status']    = $data['status'] ?? 'draft';

        return response()->json(ExamSession::create($data), 201);
    }

    public function show(ExamSession $examSession)
    {
        return response()->json($examSession->load('timetables.schoolClass', 'timetables.subject'));
    }

    public function update(Request $request, ExamSession $examSession)
    {
        $data = $request->validate([
            'name'          => 'sometimes|string|max:150',
            'academic_year' => 'sometimes|string|max:9',
            'term'          => 'sometimes|integer|between:1,3',
            'start_date'    => 'sometimes|date',
            'end_date'      => 'sometimes|date|after_or_equal:start_date',
            'status'        => 'sometimes|in:draft,active,completed,archived',
            'description'   => 'nullable|string|max:1000',
        ]);

        // Guard: completing a session requires every subject to have exactly 100% total weightage
        if (($data['status'] ?? null) === 'completed' && $examSession->status !== 'completed') {
            $this->assertAllSubjectsWeightageComplete($examSession, $data);
        }

        $examSession->update($data);

        return response()->json($examSession);
    }

    public function destroy(ExamSession $examSession)
    {
        $examSession->delete();
        return response()->json(['message' => 'Exam session deleted.']);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Verify that:
     *   (a) every subject that has ANY assessments for this session's term/year sums to exactly 100%
     *   (b) every subject scheduled on this session's exam timetable also has assessments at 100%
     *       — this catches timetable subjects with zero assessments, which are invisible to (a)'s GROUP BY
     *
     * Note: if no class-subject assignment table exists beyond the timetable, timetable entries are
     * the authoritative source of "expected subjects". Subjects not on the timetable and not in
     * assessments are not checked (there is no canonical subject-roster table).
     */
    private function assertAllSubjectsWeightageComplete(ExamSession $session, array $incoming): void
    {
        $term         = $incoming['term']          ?? $session->term;
        $academicYear = $incoming['academic_year'] ?? $session->academic_year;

        // (a) Subjects that have assessments but whose totals ≠ 100%
        $incompleteAssessed = DB::table('assessments')
            ->join('subjects', 'assessments.subject_id', '=', 'subjects.id')
            ->select('subjects.id as subject_id', 'subjects.name as subject_name',
                     DB::raw('ROUND(SUM(assessments.weightage), 2) as total_weightage'))
            ->where('assessments.school_id',     $session->school_id)
            ->where('assessments.term',          $term)
            ->where('assessments.academic_year', $academicYear)
            ->whereNull('assessments.deleted_at')
            ->groupBy('subjects.id', 'subjects.name')
            ->havingRaw('ABS(SUM(assessments.weightage) - 100) > 0.01')
            ->get()
            ->keyBy('subject_id');

        // (b) Timetable subjects with zero assessments (never appear in GROUP BY above)
        $timetableSubjectIds = DB::table('exam_timetables')
            ->where('exam_session_id', $session->id)
            ->whereNull('deleted_at')
            ->distinct()
            ->pluck('subject_id')
            ->toArray();

        $zeroAssessmentProblems = collect();
        if (!empty($timetableSubjectIds)) {
            $assessedSubjectIds = DB::table('assessments')
                ->where('school_id',     $session->school_id)
                ->where('term',          $term)
                ->where('academic_year', $academicYear)
                ->whereNull('deleted_at')
                ->distinct()
                ->pluck('subject_id')
                ->toArray();

            $missingIds = array_diff($timetableSubjectIds, $assessedSubjectIds);

            if (!empty($missingIds)) {
                $zeroAssessmentProblems = DB::table('subjects')
                    ->whereIn('id', $missingIds)
                    ->get(['id as subject_id', 'name as subject_name'])
                    ->map(fn($s) => (object) [
                        'subject_id'      => $s->subject_id,
                        'subject_name'    => $s->subject_name,
                        'total_weightage' => '0 (no assessments)',
                    ]);
            }
        }

        if ($incompleteAssessed->isEmpty() && $zeroAssessmentProblems->isEmpty()) {
            return;
        }

        $problems = $incompleteAssessed
            ->map(fn($r) => "{$r->subject_name} ({$r->total_weightage}%)")
            ->values()
            ->toArray();

        foreach ($zeroAssessmentProblems as $s) {
            if (!$incompleteAssessed->has($s->subject_id)) {
                $problems[] = "{$s->subject_name} ({$s->total_weightage})";
            }
        }

        throw ValidationException::withMessages([
            'status' => [
                'Cannot mark session as completed: the following subject(s) do not have assessment weightages totalling 100%: '
                . implode(', ', $problems)
                . '. Adjust assessments before publishing results.',
            ],
        ]);
    }

    public function restore(int $id, Request $request)
    {
        $session = ExamSession::withTrashed()
            ->where('id', $id)
            ->where('school_id', $request->user()->school_id)
            ->firstOrFail();

        $session->restore();

        return response()->json($session);
    }
}
