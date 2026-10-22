<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Communication;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnnouncementController extends Controller
{
    // Always hidden from parents regardless of class/grade matching
    private const STAFF_ONLY_AUDIENCES = ['teachers', 'staff'];

    public function index(Request $request)
    {
        $request->validate([
            'status'      => 'nullable|in:draft,scheduled,queued,processing,completed,failed,cancelled',
            'from_date'   => 'nullable|date',
            'to_date'     => 'nullable|date|after_or_equal:from_date',
            'search'      => 'nullable|string|max:100',
            'active_only' => 'nullable|boolean',
            'per_page'    => 'nullable|integer|min:1|max:100',
        ]);

        $user  = $request->user();
        $query = Communication::where('channel', 'announcement')
            ->when($request->status,    fn($q) => $q->where('status',    $request->status))
            ->when($request->from_date, fn($q) => $q->whereDate('created_at', '>=', $request->from_date))
            ->when($request->to_date,   fn($q) => $q->whereDate('created_at', '<=', $request->to_date))
            ->when($request->search, fn($q) => $q->where(function ($sub) use ($request) {
                $sub->where('subject', 'like', "%{$request->search}%")
                    ->orWhere('body',   'like', "%{$request->search}%");
            }))
            ->when($request->boolean('active_only'), function ($q) {
                $now = now();
                $q->where(fn($sub) => $sub->whereNull('published_at')->orWhere('published_at', '<=', $now))
                  ->where(fn($sub) => $sub->whereNull('expires_at')->orWhere('expires_at', '>', $now));
            })
            ->with('createdBy')
            ->orderBy('created_at', 'desc');

        if ($user->isParent()) {
            $this->applyParentFilter($query, $user);
        }

        return response()->json($query->paginate((int) ($request->per_page ?? 20)));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'subject'        => 'required|string|max:255',
            'body'           => 'required|string',
            'audience_type'  => 'required|in:all,parents,teachers,staff,class,grade',
            'audience_filter'=> 'nullable|array',
            'published_at'   => 'nullable|date',
            'expires_at'     => 'nullable|date|after:published_at',
        ]);

        $comm = DB::transaction(function () use ($data, $request) {
            return Communication::create([
                'school_id'            => $request->user()->school_id,
                'created_by_user_id'   => $request->user()->id,
                'channel'              => 'announcement',
                'audience_type'        => $data['audience_type'],
                'audience_filter_json' => $data['audience_filter'] ?? null,
                'subject'              => $data['subject'],
                'body'                 => $data['body'],
                'published_at'         => $data['published_at'] ?? now(),
                'expires_at'           => $data['expires_at'] ?? null,
                'status'               => 'completed',
                'sent_at'              => now(),
                'total_recipients'     => 0,
                'successful_deliveries'=> 0,
                'failed_deliveries'    => 0,
            ]);
        });

        // Observer handles 'created' audit log.

        return response()->json($comm->load('createdBy'), 201);
    }

    public function show(Communication $announcement)
    {
        abort_if($announcement->channel !== 'announcement', 404);

        $user = request()->user();
        if ($user->isParent()) {
            $this->authorizeParentShow($user, $announcement);
        }

        return response()->json($announcement->load('createdBy'));
    }

    public function update(Request $request, Communication $announcement)
    {
        abort_if($announcement->channel !== 'announcement', 404);

        $user = $request->user();

        if ($user->role === 'teacher') {
            abort_unless(
                $announcement->created_by_user_id === $user->id,
                403,
                'You can only edit your own announcements.'
            );
        }

        $data = $request->validate([
            'subject'        => 'sometimes|string|max:255',
            'body'           => 'sometimes|string',
            'audience_type'  => 'sometimes|in:all,parents,teachers,staff,class,grade',
            'audience_filter'=> 'nullable|array',
            'published_at'   => 'nullable|date',
            'expires_at'     => 'nullable|date|after:published_at',
        ]);

        if (array_key_exists('audience_filter', $data)) {
            $data['audience_filter_json'] = $data['audience_filter'];
            unset($data['audience_filter']);
        }

        $announcement->update($data);

        // Observer handles 'updated' audit log.

        return response()->json($announcement->fresh()->load('createdBy'));
    }

    public function destroy(Communication $announcement)
    {
        abort_if($announcement->channel !== 'announcement', 404);

        // Observer handles 'deleted' audit log.
        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted.']);
    }

    // ── Parent-scoped helpers ─────────────────────────────────────────────────

    /**
     * Restrict an announcement query to only what a parent is allowed to see:
     *   - 'all' and 'parents' audience: always visible
     *   - 'class' audience: only if parent's child is enrolled in that class
     *   - 'grade' audience: only if parent's child is in that grade level
     *   - 'teachers' / 'staff': never visible
     */
    private function applyParentFilter($query, User $user): void
    {
        [$childGrades, $childClassIds] = $this->resolveChildContext($user);

        $query->where(function ($q) use ($childGrades, $childClassIds) {
            // Always-visible audience types
            $q->whereIn('audience_type', ['all', 'parents']);

            // Grade announcements visible only if a child is in that grade
            if (!empty($childGrades)) {
                $q->orWhere(function ($sub) use ($childGrades) {
                    $sub->where('audience_type', 'grade')
                        ->whereIn(
                            DB::raw($this->audienceJsonText('grade_level')),
                            $childGrades
                        );
                });
            }

            // Class announcements visible only if a child is in that class
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
    }

    /**
     * Gate a single announcement show() for a parent:
     * 'all'/'parents' always allowed; 'class'/'grade' require child membership; others → 403.
     */
    private function authorizeParentShow(User $user, Communication $announcement): void
    {
        if (in_array($announcement->audience_type, ['all', 'parents'])) {
            return;
        }

        if (in_array($announcement->audience_type, self::STAFF_ONLY_AUDIENCES)) {
            abort(403, 'You do not have access to this announcement.');
        }

        [$childGrades, $childClassIds] = $this->resolveChildContext($user);

        if ($announcement->audience_type === 'grade') {
            $gradeLevel = $announcement->audience_filter_json['grade_level'] ?? null;
            abort_unless(
                $gradeLevel && in_array($gradeLevel, $childGrades),
                403,
                'You do not have access to this announcement.'
            );
            return;
        }

        if ($announcement->audience_type === 'class') {
            $classId = $announcement->audience_filter_json['class_id'] ?? null;
            abort_unless(
                $classId && in_array($classId, $childClassIds),
                403,
                'You do not have access to this announcement.'
            );
            return;
        }

        abort(403, 'You do not have access to this announcement.');
    }

    /**
     * Returns [$childGrades, $childClassIds] for the given parent user.
     * Uses explicit school_id + parent_user_id scoping — safe in any context.
     */
    private function resolveChildContext(User $user): array
    {
        // Pivot-first: find children linked via parent_student
        $children = Student::withoutTenantScope()
            ->whereExists(function ($query) use ($user) {
                $query->select(DB::raw(1))
                    ->from('parent_student')
                    ->whereColumn('parent_student.student_id', 'students.id')
                    ->where('parent_student.parent_user_id', $user->id)
                    ->where('parent_student.school_id', $user->school_id)
                    ->whereNull('parent_student.deleted_at');
            })
            ->where('students.school_id', $user->school_id)
            ->get(['students.grade_level', 'students.section']);

        // Legacy fallback: pre-migration data
        if ($children->isEmpty()) {
            $children = Student::withoutTenantScope()
                ->where('parent_user_id', $user->id)
                ->where('school_id', $user->school_id)
                ->get(['grade_level', 'section']);
        }

        if ($children->isEmpty()) {
            return [[], []];
        }

        $childGrades = $children->pluck('grade_level')->unique()->values()->all();

        // Find class IDs for all classes that contain any of this parent's children.
        // A child is in a class if their grade_level matches and (if class has a section)
        // their section matches too.
        $childClassIds = SchoolClass::withoutTenantScope()
            ->where('school_id', $user->school_id)
            ->where(function ($q) use ($children) {
                foreach ($children as $child) {
                    $q->orWhere(function ($sub) use ($child) {
                        $sub->where('grade_level', $child->grade_level);
                        if ($child->section) {
                            // Class matches if it has no section (grade-wide) or same section
                            $sub->where(function ($s) use ($child) {
                                $s->whereNull('section')
                                  ->orWhere('section', $child->section);
                            });
                        }
                    });
                }
            })
            ->pluck('id')
            ->all();

        return [$childGrades, $childClassIds];
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
