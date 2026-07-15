<?php

namespace App\Services;

use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Centralised authorization for the /api/portal/ parent portal routes.
 *
 * All controllers serving portal endpoints must resolve student access through
 * this service — no manual parent_user_id checks scattered across controllers.
 *
 * Authorization strategy (pivot-first with legacy fallback):
 *   1. Check parent_student pivot table for an active (non-deleted) link.
 *   2. Fall back to students.parent_user_id if no pivot link is found.
 *
 * The fallback exists only for data that pre-dates the Phase 5B hardening
 * migration. After the migration runs, every legacy link is backfilled into the
 * pivot table, making the fallback a no-op in practice. It is retained to
 * avoid breaking any edge cases where the two get out of sync.
 */
class PortalAccessService
{
    /**
     * Check whether $parent is authorized to access $student's data.
     *
     * Checks the pivot table first; falls back to students.parent_user_id.
     * Both checks are school-scoped to prevent cross-tenant access.
     */
    public function isParentOf(User $parent, Student $student): bool
    {
        // Pivot check (primary)
        $viaLink = DB::table('parent_student')
            ->where('school_id',      $student->school_id)
            ->where('parent_user_id', $parent->id)
            ->where('student_id',     $student->id)
            ->whereNull('deleted_at')
            ->exists();

        if ($viaLink) {
            return true;
        }

        // Legacy fallback: parent_user_id kept in sync with the primary contact
        return $student->parent_user_id === $parent->id;
    }

    /**
     * Resolve a student the given parent is authorized to view.
     *
     * Aborts:
     *   403 — user has no school_id (platform_admin without school context)
     *   404 — student not found in this school
     *   403 — student exists but no active link to this parent
     */
    public function resolveChildForParent(User $user, int $studentId): Student
    {
        abort_if(!$user->school_id, 403, 'No school context.');

        $student = Student::withoutTenantScope()
            ->where('id', $studentId)
            ->where('school_id', $user->school_id)
            ->firstOrFail();

        abort_unless(
            $this->isParentOf($user, $student),
            403,
            'You do not have access to this student record.'
        );

        return $student;
    }

    /**
     * Return all students linked to this parent within their school.
     *
     * Pivot is the primary source; falls back to parent_user_id only when
     * no pivot links exist (e.g. pre-migration data edge case).
     *
     * Returns an empty collection if no children are linked.
     */
    public function childrenForParent(User $user): Collection
    {
        abort_if(!$user->school_id, 403, 'No school context.');

        // Pivot-first: find students linked via parent_student
        $viaLink = Student::withoutTenantScope()
            ->with('school')
            ->whereExists(function ($query) use ($user) {
                $query->select(DB::raw(1))
                    ->from('parent_student')
                    ->whereColumn('parent_student.student_id', 'students.id')
                    ->where('parent_student.parent_user_id', $user->id)
                    ->where('parent_student.school_id', $user->school_id)
                    ->whereNull('parent_student.deleted_at');
            })
            ->where('students.school_id', $user->school_id)
            ->get();

        if ($viaLink->isNotEmpty()) {
            return $viaLink;
        }

        // Legacy fallback: pre-migration data with only parent_user_id set
        return Student::withoutTenantScope()
            ->with('school')
            ->where('parent_user_id', $user->id)
            ->where('school_id', $user->school_id)
            ->get();
    }
}
