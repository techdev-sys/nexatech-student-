<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BehaviourIncident;
use App\Models\Communication;
use App\Models\ExamSession;
use App\Models\Grade;
use App\Models\SchoolClass;
use App\Models\TimetableEntry;
use App\Services\BehaviourScoreService;
use App\Services\PortalAccessService;
use App\Services\ReportCardService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Dedicated parent portal endpoints (Phase 5B).
 *
 * All routes are protected by auth:sanctum + role:parent.
 * All student access is verified through PortalAccessService — no manual
 * parent_user_id checks outside that service.
 *
 * No student role exists in this system, so student-self portal routes are omitted.
 */
class PortalController extends Controller
{
    public function __construct(
        private PortalAccessService   $access,
        private BehaviourScoreService $scorer,
        private ReportCardService     $reportCards,
    ) {}

    // ── GET /api/portal/children ──────────────────────────────────────────────

    public function children(Request $request)
    {
        $children = $this->access->childrenForParent($request->user());

        return response()->json(
            $children->map(fn($s) => [
                'id'             => $s->id,
                'name'           => $s->full_name,
                'student_number' => $s->student_number,
                'grade_level'    => $s->grade_level,
                'section'        => $s->section,
                'status'         => $s->status,
                'school_name'    => $s->school?->name,
            ])->values()
        );
    }

    // ── GET /api/portal/children/{student}/overview ───────────────────────────

    public function childOverview(Request $request, int $studentId)
    {
        $user     = $request->user();
        $student  = $this->access->resolveChildForParent($user, $studentId);
        $schoolId = $student->school_id;

        // ── Attendance summary (aggregate via SQL) ───────────────────────────
        $att = DB::table('attendance')
            ->where('student_id', $student->id)
            ->where('school_id',  $schoolId)
            ->whereNull('deleted_at')
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN status = 'absent'  THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN status = 'late'    THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused
            ")
            ->first();

        $attTotal   = (int) $att->total;
        $attPresent = (int) $att->present;

        $attendance = [
            'total'      => $attTotal,
            'present'    => $attPresent,
            'absent'     => (int) $att->absent,
            'late'       => (int) $att->late,
            'excused'    => (int) $att->excused,
            'percentage' => $attTotal > 0 ? round(($attPresent / $attTotal) * 100, 1) : null,
        ];

        // ── Fees summary ─────────────────────────────────────────────────────
        $fees = DB::table('invoices')
            ->where('student_id', $student->id)
            ->where('school_id',  $schoolId)
            ->whereNull('deleted_at')
            ->selectRaw('COALESCE(SUM(balance_amount), 0) as outstanding, COUNT(*) as invoice_count')
            ->first();

        // ── Behaviour summary ────────────────────────────────────────────────
        $behaviour = $this->scorer->summary($student, []);

        // ── Latest results from most recent completed session ────────────────
        $latestSession = ExamSession::withoutTenantScope()
            ->where('school_id', $schoolId)
            ->where('status', 'completed')
            ->orderByDesc('academic_year')
            ->orderByDesc('term')
            ->first(['term', 'academic_year', 'name']);

        $latestResults = null;
        if ($latestSession) {
            $avg = DB::table('grades')
                ->where('student_id',    $student->id)
                ->where('school_id',     $schoolId)
                ->where('term',          $latestSession->term)
                ->where('academic_year', $latestSession->academic_year)
                ->whereNotNull('weighted_score')
                ->whereNull('deleted_at')
                ->avg('weighted_score');

            if ($avg !== null) {
                $latestResults = [
                    'session_name'  => $latestSession->name,
                    'term'          => $latestSession->term,
                    'academic_year' => $latestSession->academic_year,
                    'average'       => round((float) $avg, 1),
                ];
            }
        }

        // ── Today's class timetable ──────────────────────────────────────────
        $today         = strtolower(now()->format('l'));
        $timetableToday = $this->childTimetableEntries($student, $schoolId, today: $today);

        // ── Recent announcements (active, parent-visible, 5 max) ─────────────
        $now = now();
        $announcements = Communication::withoutTenantScope()
            ->where('school_id', $schoolId)
            ->where('channel', 'announcement')
            ->where(fn($q) => $q->whereNull('published_at')->orWhere('published_at', '<=', $now))
            ->where(fn($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', $now))
            ->whereIn('audience_type', ['all', 'parents'])
            ->orderByDesc('published_at')
            ->limit(5)
            ->get(['id', 'subject', 'published_at'])
            ->map(fn($a) => [
                'id'           => $a->id,
                'subject'      => $a->subject,
                'published_at' => $a->published_at?->format('Y-m-d'),
            ])->values();

        return response()->json([
            'student' => [
                'id'             => $student->id,
                'name'           => $student->full_name,
                'student_number' => $student->student_number,
                'grade_level'    => $student->grade_level,
                'section'        => $student->section,
                'status'         => $student->status,
            ],
            'attendance'      => $attendance,
            'fees'            => [
                'outstanding'   => (float) $fees->outstanding,
                'invoice_count' => (int) $fees->invoice_count,
            ],
            'behaviour'       => $behaviour,
            'latest_results'  => $latestResults,
            'timetable_today' => $timetableToday,
            'announcements'   => $announcements,
        ]);
    }

    // ── GET /api/portal/children/{student}/attendance ─────────────────────────

    public function childAttendance(Request $request, int $studentId)
    {
        $user    = $request->user();
        $student = $this->access->resolveChildForParent($user, $studentId);

        $request->validate([
            'from_date' => 'nullable|date',
            'to_date'   => 'nullable|date|after_or_equal:from_date',
            'status'    => 'nullable|in:present,absent,late,excused',
            'per_page'  => 'nullable|integer|min:1|max:100',
        ]);

        $schoolId = $student->school_id;

        // Aggregate summary (not filtered by date — always all-time)
        $att = DB::table('attendance')
            ->where('student_id', $student->id)
            ->where('school_id',  $schoolId)
            ->whereNull('deleted_at')
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN status = 'absent'  THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN status = 'late'    THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused
            ")
            ->first();

        $attTotal   = (int) $att->total;
        $attPresent = (int) $att->present;

        // History (paginated, filterable)
        $history = DB::table('attendance')
            ->leftJoin('subjects', 'attendance.subject_id', '=', 'subjects.id')
            ->where('attendance.student_id', $student->id)
            ->where('attendance.school_id',  $schoolId)
            ->whereNull('attendance.deleted_at')
            ->when($request->from_date, fn($q) => $q->whereDate('attendance.date', '>=', $request->from_date))
            ->when($request->to_date,   fn($q) => $q->whereDate('attendance.date', '<=', $request->to_date))
            ->when($request->status,    fn($q) => $q->where('attendance.status',    $request->status))
            ->select(
                'attendance.id',
                'attendance.date',
                'attendance.status',
                'attendance.remarks',
                'subjects.name as subject_name'
            )
            ->orderByDesc('attendance.date')
            ->paginate((int) ($request->per_page ?? 20));

        return response()->json([
            'summary' => [
                'total'      => $attTotal,
                'present'    => $attPresent,
                'absent'     => (int) $att->absent,
                'late'       => (int) $att->late,
                'excused'    => (int) $att->excused,
                'percentage' => $attTotal > 0 ? round(($attPresent / $attTotal) * 100, 1) : null,
            ],
            'history' => $history,
        ]);
    }

    // ── GET /api/portal/children/{student}/behaviour ──────────────────────────

    public function childBehaviour(Request $request, int $studentId)
    {
        $user    = $request->user();
        $student = $this->access->resolveChildForParent($user, $studentId);

        $request->validate([
            'term'          => 'nullable|string|max:50',
            'academic_year' => 'nullable|string|max:10',
            'per_page'      => 'nullable|integer|min:1|max:100',
        ]);

        $filters = array_filter([
            'term'          => $request->term,
            'academic_year' => $request->academic_year,
        ]);

        $summary = $this->scorer->summary($student, $filters);

        // Paginated incidents — exclude action_taken (staff-only field)
        $incidents = BehaviourIncident::withoutTenantScope()
            ->with('incidentType')
            ->where('student_id', $student->id)
            ->where('school_id',  $student->school_id)
            ->when($request->term,          fn($q) => $q->where('term', $request->term))
            ->when($request->academic_year, fn($q) => $q->where('academic_year', $request->academic_year))
            ->orderByDesc('incident_date')
            ->orderByDesc('id')
            ->paginate((int) ($request->per_page ?? 20));

        // Remap to omit action_taken
        $incidents->getCollection()->transform(fn($inc) => [
            'id'            => $inc->id,
            'incident_date' => $inc->incident_date?->format('Y-m-d'),
            'description'   => $inc->description,
            'points'        => $inc->points,
            'status'        => $inc->status,
            'term'          => $inc->term,
            'academic_year' => $inc->academic_year,
            'type'          => $inc->incidentType ? [
                'name'     => $inc->incidentType->name,
                'category' => $inc->incidentType->category,
                'severity' => $inc->incidentType->severity,
            ] : null,
        ]);

        return response()->json([
            'summary'   => $summary,
            'incidents' => $incidents,
        ]);
    }

    // ── GET /api/portal/children/{student}/fees ───────────────────────────────

    public function childFees(Request $request, int $studentId)
    {
        $user    = $request->user();
        $student = $this->access->resolveChildForParent($user, $studentId);

        $request->validate([
            'status'   => 'nullable|in:unpaid,partially_paid,paid',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $invoices = DB::table('invoices')
            ->leftJoin('fee_structures', 'invoices.fee_structure_id', '=', 'fee_structures.id')
            ->where('invoices.student_id', $student->id)
            ->where('invoices.school_id',  $student->school_id)
            ->whereNull('invoices.deleted_at')
            ->when($request->status, fn($q) => $q->where('invoices.status', $request->status))
            ->select(
                'invoices.id',
                'invoices.invoice_number',
                'invoices.total_amount',
                'invoices.paid_amount',
                'invoices.balance_amount',
                'invoices.status',
                'invoices.due_date',
                'fee_structures.term',
                'fee_structures.academic_year',
                'fee_structures.currency',
            )
            ->orderByDesc('invoices.created_at')
            ->paginate((int) ($request->per_page ?? 20));

        // Outstanding total (no filter — always all outstanding)
        $outstanding = DB::table('invoices')
            ->where('student_id', $student->id)
            ->where('school_id',  $student->school_id)
            ->whereNull('deleted_at')
            ->sum('balance_amount');

        // Recent payment transactions
        $transactions = DB::table('transactions')
            ->join('invoices', 'transactions.invoice_id', '=', 'invoices.id')
            ->where('invoices.student_id', $student->id)
            ->where('invoices.school_id',  $student->school_id)
            ->select(
                'transactions.id',
                'transactions.amount',
                'transactions.status',
                'transactions.gateway as payment_method',
                'transactions.created_at',
                'invoices.invoice_number',
            )
            ->orderByDesc('transactions.created_at')
            ->limit(20)
            ->get();

        return response()->json([
            'outstanding'  => (float) $outstanding,
            'invoices'     => $invoices,
            'transactions' => $transactions,
        ]);
    }

    // ── GET /api/portal/children/{student}/results ────────────────────────────

    /**
     * Published results only: grades from exam sessions with status=completed.
     * Grades outside completed sessions are not surfaced.
     */
    public function childResults(Request $request, int $studentId)
    {
        $user    = $request->user();
        $student = $this->access->resolveChildForParent($user, $studentId);

        $request->validate([
            'term'          => 'nullable|integer|between:1,3',
            'academic_year' => 'nullable|string|max:9',
        ]);

        $schoolId = $student->school_id;

        $completedSessions = ExamSession::withoutTenantScope()
            ->where('school_id', $schoolId)
            ->where('status', 'completed')
            ->when($request->term,          fn($q) => $q->where('term', $request->term))
            ->when($request->academic_year, fn($q) => $q->where('academic_year', $request->academic_year))
            ->orderByDesc('academic_year')
            ->orderByDesc('term')
            ->get(['id', 'name', 'term', 'academic_year']);

        if ($completedSessions->isEmpty()) {
            return response()->json(['results' => []]);
        }

        $results = [];

        foreach ($completedSessions as $session) {
            $grades = DB::table('grades')
                ->leftJoin('subjects',    'grades.subject_id',    '=', 'subjects.id')
                ->leftJoin('assessments', 'grades.assessment_id', '=', 'assessments.id')
                ->where('grades.student_id',    $student->id)
                ->where('grades.school_id',     $schoolId)
                ->where('grades.term',          $session->term)
                ->where('grades.academic_year', $session->academic_year)
                ->whereNotNull('grades.weighted_score')
                ->whereNull('grades.deleted_at')
                ->select(
                    'subjects.name as subject',
                    'assessments.name as assessment',
                    'grades.score',
                    'grades.weighted_score',
                    'grades.grade_letter',
                    'grades.remarks',
                )
                ->get();

            if ($grades->isEmpty()) {
                continue;
            }

            $results[] = [
                'session_name'   => $session->name,
                'term'           => $session->term,
                'academic_year'  => $session->academic_year,
                'average_score'  => round($grades->groupBy('subject')->map(fn($subjectGrades) => $subjectGrades->sum('weighted_score'))->avg(), 1),
                'subject_count'  => $grades->pluck('subject')->unique()->count(),
                'grades'         => $grades->map(fn($g) => [
                    'subject'        => $g->subject,
                    'assessment'     => $g->assessment,
                    'score'          => $g->score,
                    'weighted_score' => $g->weighted_score,
                    'grade_letter'   => $g->grade_letter,
                    'remarks'        => $g->remarks,
                ])->values(),
            ];
        }

        return response()->json(['results' => $results]);
    }

    // ── GET /api/portal/children/{student}/report-cards ──────────────────────

    /**
     * Lists available report cards (term/year combos with a completed session AND grades).
     * Actual report card data fetched via GET /api/students/{id}/report-card (existing route).
     */
    public function childReportCards(Request $request, int $studentId)
    {
        $user    = $request->user();
        $student = $this->access->resolveChildForParent($user, $studentId);
        $schoolId = $student->school_id;

        $completedSessions = ExamSession::withoutTenantScope()
            ->where('school_id', $schoolId)
            ->where('status', 'completed')
            ->orderByDesc('academic_year')
            ->orderByDesc('term')
            ->get(['id', 'name', 'term', 'academic_year', 'start_date', 'end_date']);

        $available = [];

        foreach ($completedSessions as $session) {
            $hasGrades = DB::table('grades')
                ->where('student_id',    $student->id)
                ->where('school_id',     $schoolId)
                ->where('term',          $session->term)
                ->where('academic_year', $session->academic_year)
                ->whereNull('deleted_at')
                ->exists();

            if (!$hasGrades) {
                continue;
            }

            $available[] = [
                'session_name'  => $session->name,
                'term'          => $session->term,
                'academic_year' => $session->academic_year,
                'start_date'    => $session->start_date?->format('Y-m-d'),
                'end_date'      => $session->end_date?->format('Y-m-d'),
                'report_card_url' => "/api/students/{$student->id}/report-card"
                    . "?term={$session->term}&academic_year={$session->academic_year}",
                'pdf_url'       => "/api/students/{$student->id}/report-card/pdf"
                    . "?term={$session->term}&academic_year={$session->academic_year}",
            ];
        }

        return response()->json([
            'student_id'   => $student->id,
            'student_name' => $student->full_name,
            'report_cards' => $available,
        ]);
    }

    // ── GET /api/portal/children/{student}/timetable ──────────────────────────

    public function childTimetable(Request $request, int $studentId)
    {
        $user    = $request->user();
        $student = $this->access->resolveChildForParent($user, $studentId);

        $request->validate([
            'term'          => 'nullable|string|max:50',
            'academic_year' => 'nullable|string|max:9',
        ]);

        $schoolId = $student->school_id;
        $entries  = $this->childTimetableEntries($student, $schoolId, request: $request);

        $class = SchoolClass::withoutTenantScope()
            ->where('school_id',  $schoolId)
            ->where('grade_level', $student->grade_level)
            ->where(function ($q) use ($student) {
                if ($student->section) {
                    $q->where('section', $student->section);
                } else {
                    $q->whereNull('section');
                }
            })
            ->first(['id', 'name', 'grade_level', 'section']);

        return response()->json([
            'class'   => $class,
            'entries' => $entries,
        ]);
    }

    // ── GET /api/portal/announcements ─────────────────────────────────────────

    /**
     * Active, parent-visible announcements for the parent's school.
     * Audience filtering (grade/class scope) is applied for parents with linked children.
     */
    public function announcements(Request $request)
    {
        $user = $request->user();

        abort_if(!$user->school_id, 403, 'No school context.');

        $request->validate([
            'per_page' => 'nullable|integer|min:1|max:100',
            'search'   => 'nullable|string|max:100',
        ]);

        $now = now();

        // Only active, non-expired, non-draft announcements for this school
        $query = Communication::withoutTenantScope()
            ->where('school_id', $user->school_id)
            ->where('channel', 'announcement')
            ->where(fn($q) => $q->whereNull('published_at')->orWhere('published_at', '<=', $now))
            ->where(fn($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', $now))
            ->when($request->search, fn($q) => $q->where(fn($sub) =>
                $sub->where('subject', 'like', "%{$request->search}%")
                    ->orWhere('body', 'like', "%{$request->search}%")
            ))
            ->with('createdBy')
            ->orderByDesc('published_at');

        // Scope to parent-visible audiences
        $children = $this->access->childrenForParent($user);
        $childGrades   = $children->pluck('grade_level')->unique()->values()->all();
        $childSections = $children->map(fn($c) => ['grade_level' => $c->grade_level, 'section' => $c->section])->all();

        $childClassIds = SchoolClass::withoutTenantScope()
            ->where('school_id', $user->school_id)
            ->where(function ($q) use ($children) {
                if ($children->isEmpty()) {
                    $q->whereRaw('1 = 0');
                    return;
                }
                foreach ($children as $child) {
                    $q->orWhere(function ($sub) use ($child) {
                        $sub->where('grade_level', $child->grade_level);
                        if ($child->section) {
                            $sub->where(fn($s) => $s->whereNull('section')->orWhere('section', $child->section));
                        } else {
                            $sub->whereNull('section');
                        }
                    });
                }
            })
            ->pluck('id')
            ->all();

        $query->where(function ($q) use ($childGrades, $childClassIds) {
            // Always visible to parents
            $q->whereIn('audience_type', ['all', 'parents']);

            if (!empty($childGrades)) {
                $q->orWhere(function ($sub) use ($childGrades) {
                    $sub->where('audience_type', 'grade')
                        ->whereIn(
                            DB::raw($this->audienceJsonText('grade_level')),
                            $childGrades
                        );
                });
            }

            if (!empty($childClassIds)) {
                $ids          = $childClassIds;
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $q->orWhere(function ($sub) use ($ids, $placeholders) {
                    $sub->where('audience_type', 'class')
                        ->whereRaw(
                            $this->audienceJsonInteger('class_id') . " IN ($placeholders)",
                            $ids
                        );
                });
            }
        });

        return response()->json($query->paginate((int) ($request->per_page ?? 20)));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Returns timetable entries for a student's class.
     * Optionally filtered by $today (day_of_week string, e.g. "monday").
     */
    private function childTimetableEntries(
        \App\Models\Student $student,
        int                 $schoolId,
        ?string             $today   = null,
        ?Request            $request = null,
    ): array {
        $class = SchoolClass::withoutTenantScope()
            ->where('school_id',   $schoolId)
            ->where('grade_level', $student->grade_level)
            ->where(function ($q) use ($student) {
                if ($student->section) {
                    $q->where('section', $student->section);
                } else {
                    $q->whereNull('section');
                }
            })
            ->first(['id']);

        if (!$class) {
            return [];
        }

        return TimetableEntry::withoutTenantScope()
            ->with(['subject', 'teacher', 'period', 'room'])
            ->where('school_id', $schoolId)
            ->where('class_id', $class->id)
            ->where('status', 'active')
            ->when($today,              fn($q) => $q->where('day_of_week', $today))
            ->when($request?->term,          fn($q) => $q->where('term', $request->term))
            ->when($request?->academic_year, fn($q) => $q->where('academic_year', $request->academic_year))
            ->orderBy('day_of_week')
            ->orderBy('period_id')
            ->get()
            ->map(fn($e) => [
                'id'           => $e->id,
                'day_of_week'  => $e->day_of_week,
                'subject'      => $e->subject?->name,
                'teacher'      => $e->teacher?->name,
                'period'       => $e->period?->name,
                'start_time'   => $e->period?->start_time,
                'end_time'     => $e->period?->end_time,
                'room'         => $e->room?->name,
            ])->values()->all();
    }

    private function audienceJsonText(string $key): string
    {
        return match (DB::getDriverName()) {
            'pgsql' => "audience_filter_json->>'{$key}'",
            'sqlite' => "json_extract(audience_filter_json, '$.{$key}')",
            default => "JSON_UNQUOTE(JSON_EXTRACT(audience_filter_json, '$.{$key}'))",
        };
    }

    private function audienceJsonInteger(string $key): string
    {
        return match (DB::getDriverName()) {
            'pgsql' => "(audience_filter_json->>'{$key}')::bigint",
            'sqlite' => "CAST(json_extract(audience_filter_json, '$.{$key}') AS INTEGER)",
            default => "CAST(JSON_UNQUOTE(JSON_EXTRACT(audience_filter_json, '$.{$key}')) AS UNSIGNED)",
        };
    }
}
