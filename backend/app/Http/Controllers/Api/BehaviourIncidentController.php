<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BehaviourIncident;
use App\Models\Student;
use App\Services\ActivityLogger;
use App\Services\BehaviourNotificationService;
use App\Services\BehaviourScoreService;
use App\Services\PortalAccessService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BehaviourIncidentController extends Controller
{
    public function __construct(
        private BehaviourScoreService        $scorer,
        private BehaviourNotificationService $notifier,
        private PortalAccessService          $access,
    ) {}

    public function index(Request $request)
    {
        $request->validate([
            'student_id'       => 'nullable|integer',
            'incident_type_id' => 'nullable|integer',
            'class_id'         => 'nullable|integer',
            'category'         => 'nullable|in:positive,negative,neutral',
            'severity'         => 'nullable|in:low,medium,high,critical',
            'status'           => 'nullable|in:recorded,reviewed,resolved,escalated',
            'term'             => 'nullable|string|max:50',
            'academic_year'    => 'nullable|string|max:10',
            'from_date'        => 'nullable|date',
            'to_date'          => 'nullable|date|after_or_equal:from_date',
            'per_page'         => 'nullable|integer|min:1|max:100',
            'search'           => 'nullable|string|max:100',
        ]);

        $incidents = BehaviourIncident::with([
                'student', 'incidentType', 'reportedBy', 'schoolClass', 'subject',
            ])
            ->when($request->student_id,       fn($q) => $q->where('student_id',       $request->student_id))
            ->when($request->incident_type_id, fn($q) => $q->where('incident_type_id', $request->incident_type_id))
            ->when($request->class_id,         fn($q) => $q->where('class_id',         $request->class_id))
            ->when($request->category,         fn($q) => $q->whereHas('incidentType',  fn($t) => $t->where('category', $request->category)))
            ->when($request->severity,         fn($q) => $q->whereHas('incidentType',  fn($t) => $t->where('severity', $request->severity)))
            ->when($request->status,           fn($q) => $q->where('status',           $request->status))
            ->when($request->term,             fn($q) => $q->where('term',             $request->term))
            ->when($request->academic_year,    fn($q) => $q->where('academic_year',    $request->academic_year))
            ->when($request->from_date,        fn($q) => $q->whereDate('incident_date', '>=', $request->from_date))
            ->when($request->to_date,          fn($q) => $q->whereDate('incident_date', '<=', $request->to_date))
            ->when($request->search, fn($q) => $q->whereHas('student', fn($s) =>
                $s->where('first_name',      'like', "%{$request->search}%")
                  ->orWhere('last_name',     'like', "%{$request->search}%")
                  ->orWhere('student_number','like', "%{$request->search}%")
            ))
            ->orderBy('incident_date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate((int) ($request->per_page ?? 20));

        return response()->json($incidents);
    }

    public function store(Request $request)
    {
        $schoolId = $request->user()->school_id;

        $data = $request->validate([
            'student_id'       => ['required', Rule::exists('students',                'id')->where('school_id', $schoolId)],
            'incident_type_id' => ['required', Rule::exists('behaviour_incident_types','id')->where('school_id', $schoolId)],
            'class_id'         => ['nullable', Rule::exists('classes',                 'id')->where('school_id', $schoolId)],
            'subject_id'       => ['nullable', Rule::exists('subjects',                'id')->where('school_id', $schoolId)],
            'term'             => 'nullable|string|max:50',
            'academic_year'    => 'nullable|string|max:10',
            'points'           => 'required|integer',
            'incident_date'    => 'required|date',
            'description'      => 'nullable|string',
            'action_taken'     => 'nullable|string',
            'status'           => 'nullable|in:recorded,reviewed,resolved,escalated',
        ]);

        $data['reported_by_user_id'] = $request->user()->id;
        $data['status']              = $data['status'] ?? 'recorded';

        $incident = BehaviourIncident::create($data);
        $incident->load(['student', 'incidentType', 'reportedBy', 'schoolClass', 'subject']);

        // Observer handles the audit 'created' log.
        $queued = $this->notifier->dispatchIfRequired($incident);

        return response()->json([
            'incident'            => $incident,
            'notification_queued' => $queued,
        ], 201);
    }

    public function show(BehaviourIncident $behaviourIncident)
    {
        return response()->json(
            $behaviourIncident->load(['student', 'incidentType', 'reportedBy', 'schoolClass', 'subject'])
        );
    }

    // Valid status transitions. 'resolved' row is admin-only; non-admins are blocked before reaching it.
    private const TRANSITIONS = [
        'recorded'  => ['reviewed', 'escalated'],
        'reviewed'  => ['resolved', 'escalated'],
        'escalated' => ['reviewed', 'resolved'],
        'resolved'  => ['recorded', 'reviewed', 'escalated'],
    ];

    public function update(Request $request, BehaviourIncident $behaviourIncident)
    {
        $user = $request->user();

        // Resolved incidents are locked for non-admins
        if ($behaviourIncident->status === 'resolved' && !$user->isAdmin()) {
            abort(403, 'Resolved incidents can only be modified by administrators.');
        }

        $data = $request->validate([
            'points'        => ['sometimes', 'integer', Rule::prohibitedIf(!$user->isAdmin())],
            'description'   => 'nullable|string',
            'action_taken'  => 'nullable|string',
            'status'        => 'sometimes|in:recorded,reviewed,resolved,escalated',
            'term'          => 'nullable|string|max:50',
            'academic_year' => 'nullable|string|max:10',
        ]);

        // Enforce transition matrix
        if (isset($data['status']) && $data['status'] !== $behaviourIncident->status) {
            $allowed = self::TRANSITIONS[$behaviourIncident->status] ?? [];
            if (!in_array($data['status'], $allowed, true)) {
                abort(422, "Invalid status transition from '{$behaviourIncident->status}' to '{$data['status']}'.");
            }
        }

        $old = $behaviourIncident->toArray();

        // Set workflow timestamps and reviewer on status transitions
        if (isset($data['status'])) {
            if ($data['status'] === 'reviewed') {
                $data['reviewed_by_user_id'] = $user->id;
                $data['reviewed_at']         = now();
            } elseif ($data['status'] === 'resolved') {
                $data['resolved_at'] = now();
            } elseif ($data['status'] === 'escalated') {
                $data['escalated_at'] = now();
            }
        }

        $behaviourIncident->update($data);

        // Semantic audit log for status transitions — redact sensitive fields to match observer behaviour
        $status = $data['status'] ?? null;
        if ($status && in_array($status, ['reviewed', 'resolved', 'escalated'])) {
            $redact  = BehaviourIncident::$auditRedact;
            $safeOld = array_diff_key($old, array_flip($redact));
            $safeNew = array_diff_key($behaviourIncident->fresh()->toArray(), array_flip($redact));

            ActivityLogger::log(
                "behaviour_incident.{$status}",
                $behaviourIncident,
                $safeOld,
                $safeNew,
            );
        }

        return response()->json($behaviourIncident->fresh()->load(['student', 'incidentType', 'reportedBy']));
    }

    public function destroy(BehaviourIncident $behaviourIncident)
    {
        // Observer handles the audit 'deleted' log.
        $behaviourIncident->delete();

        return response()->json(['message' => 'Incident deleted.']);
    }

    public function restore(int $id, Request $request)
    {
        $incident = BehaviourIncident::withTrashed()
            ->where('id', $id)
            ->where('school_id', $request->user()->school_id)
            ->firstOrFail();

        $incident->restore();

        // Observer handles the audit 'restored' log.

        return response()->json($incident->load(['student', 'incidentType', 'reportedBy']));
    }

    // ── Student-scoped endpoints ───────────────────────────────────────────────

    public function studentSummary(Student $student, Request $request)
    {
        $user = $request->user();

        if ($user->isParent()) {
            // Parents can only view their own linked child (pivot-first, legacy fallback)
            abort_unless(
                $this->access->isParentOf($user, $student),
                403,
                'You can only view your own child\'s behaviour records.'
            );
        } else {
            // Admin / teacher: must belong to the same school
            abort_unless(
                $student->school_id === $user->school_id,
                403,
                'Student does not belong to your school.'
            );
        }

        $summary = $this->scorer->summary($student, $request->only('term', 'academic_year'));

        return response()->json($summary);
    }

    public function studentIncidents(Student $student, Request $request)
    {
        $user = $request->user();

        if ($user->isParent()) {
            abort_unless(
                $this->access->isParentOf($user, $student),
                403,
                'You can only view your own child\'s behaviour records.'
            );
        } else {
            abort_unless(
                $student->school_id === $user->school_id,
                403,
                'Student does not belong to your school.'
            );
        }

        $request->validate([
            'term'          => 'nullable|string|max:50',
            'academic_year' => 'nullable|string|max:10',
            'per_page'      => 'nullable|integer|min:1|max:100',
        ]);

        $incidents = BehaviourIncident::with(['incidentType', 'reportedBy'])
            ->where('student_id', $student->id)
            ->when($request->term,          fn($q) => $q->where('term',          $request->term))
            ->when($request->academic_year, fn($q) => $q->where('academic_year', $request->academic_year))
            ->orderBy('incident_date', 'desc')
            ->paginate((int) ($request->per_page ?? 20));

        return response()->json($incidents);
    }
}
