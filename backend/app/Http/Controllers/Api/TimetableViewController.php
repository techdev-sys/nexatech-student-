<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\TeacherAvailability;
use App\Models\TimetableEntry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Read-only timetable view layer (Phase 3C).
 *
 * Phase 3B built the scheduling engine (entries CRUD + conflict detection).
 * These endpoints expose role-restricted READ views over the same data — the
 * engine, services and tables are not modified here. Visibility is enforced
 * server-side: parents only ever see their linked child's class; teachers only
 * see their own teacher timetable.
 */
class TimetableViewController extends Controller
{
    private const EAGER = ['schoolClass', 'subject', 'teacher', 'room', 'period'];

    public function dashboard(Request $request)
    {
        $schoolId = $request->user()->school_id;
        $base = fn() => TimetableEntry::where('school_id', $schoolId)->where('status', 'active');

        $today = strtolower(now()->format('l')); // e.g. "monday"

        return response()->json([
            'active_entries'             => $base()->count(),
            'classes_scheduled'          => $base()->distinct()->count('class_id'),
            'teachers_scheduled'         => $base()->distinct()->count('teacher_user_id'),
            'rooms_used'                 => $base()->whereNotNull('room_id')->distinct()->count('room_id'),
            'unavailable_teachers_today' => TeacherAvailability::where('school_id', $schoolId)
                ->where('day_of_week', $today)
                ->where('availability_status', 'unavailable')
                ->distinct()->count('teacher_user_id'),
            'by_term' => TimetableEntry::where('school_id', $schoolId)
                ->where('status', 'active')
                ->selectRaw('academic_year, term, COUNT(*) as count')
                ->groupBy('academic_year', 'term')
                ->orderByDesc('count')
                ->limit(10)
                ->get(),
            'recent_changes' => TimetableEntry::with(self::EAGER)
                ->where('school_id', $schoolId)
                ->orderByDesc('updated_at')
                ->limit(8)
                ->get(),
            'availability_exceptions' => TeacherAvailability::with(['teacher', 'period'])
                ->where('school_id', $schoolId)
                ->whereIn('availability_status', ['unavailable', 'preferred'])
                ->orderByDesc('updated_at')
                ->limit(8)
                ->get(),
        ]);
    }

    public function classTimetable(Request $request, int $classId)
    {
        $request->validate([
            'term'          => 'nullable|string|max:50',
            'academic_year' => 'nullable|string|max:9',
        ]);

        $user  = $request->user();
        $class = SchoolClass::where('id', $classId)->where('school_id', $user->school_id)->first();
        abort_unless($class, 404, 'Class not found.');

        // Parents may only view the class their linked child belongs to.
        if ($user->isParent()) {
            abort_unless(
                in_array($class->id, $this->parentClassIds($user), true),
                403,
                'You can only view your own child\'s class timetable.'
            );
        }

        return response()->json([
            'class'   => $class,
            'entries' => $this->slotEntries($user->school_id, $request)
                ->where('class_id', $classId)
                ->get(),
        ]);
    }

    public function teacherTimetable(Request $request, int $teacherId)
    {
        $request->validate([
            'term'          => 'nullable|string|max:50',
            'academic_year' => 'nullable|string|max:9',
        ]);

        $user = $request->user();

        // Teachers may only view their own timetable; admins may view any teacher.
        if (!$user->isAdmin()) {
            abort_unless($teacherId === $user->id, 403, 'You can only view your own timetable.');
        }

        $teacher = User::where('id', $teacherId)
            ->where('school_id', $user->school_id)
            ->where('role', 'teacher')
            ->first(['id', 'name', 'email', 'role']);
        abort_unless($teacher, 404, 'Teacher not found.');

        return response()->json([
            'teacher'      => $teacher,
            'entries'      => $this->slotEntries($user->school_id, $request)
                ->where('teacher_user_id', $teacherId)
                ->get(),
            'availability' => TeacherAvailability::with('period')
                ->where('school_id', $user->school_id)
                ->where('teacher_user_id', $teacherId)
                ->get(),
        ]);
    }

    public function my(Request $request)
    {
        $request->validate([
            'term'          => 'nullable|string|max:50',
            'academic_year' => 'nullable|string|max:9',
        ]);

        $user = $request->user();

        if ($user->role === 'teacher') {
            return response()->json([
                'context' => 'teacher',
                'entries' => $this->slotEntries($user->school_id, $request)
                    ->where('teacher_user_id', $user->id)
                    ->get(),
            ]);
        }

        if ($user->isParent()) {
            $classIds = $this->parentClassIds($user);

            return response()->json([
                'context' => 'parent',
                'entries' => empty($classIds)
                    ? []
                    : $this->slotEntries($user->school_id, $request)
                        ->whereIn('class_id', $classIds)
                        ->get(),
            ]);
        }

        // Admins/super-admins do not have a personal teaching timetable.
        return response()->json(['context' => $user->role, 'entries' => []]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Base query for active, eager-loaded entries with optional term/year filters. */
    private function slotEntries(int $schoolId, Request $request)
    {
        return TimetableEntry::with(self::EAGER)
            ->where('school_id', $schoolId)
            ->where('status', 'active')
            ->when($request->term,          fn($q) => $q->where('term', $request->term))
            ->when($request->academic_year, fn($q) => $q->where('academic_year', $request->academic_year))
            ->orderBy('period_id');
    }

    /**
     * Class IDs the parent's linked children belong to.
     * A child is in a class when grade_level matches and (if the class defines a
     * section) the section matches. Mirrors the Phase-2 announcement scoping.
     */
    private function parentClassIds(User $user): array
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
            return [];
        }

        return SchoolClass::withoutTenantScope()
            ->where('school_id', $user->school_id)
            ->where(function ($q) use ($children) {
                foreach ($children as $child) {
                    $q->orWhere(function ($sub) use ($child) {
                        // Strict membership: grade_level AND section must match exactly.
                        // A null/empty child section matches ONLY classes whose section is
                        // also null — it is never treated as a wildcard across the grade.
                        $sub->where('grade_level', $child->grade_level);
                        if ($child->section === null || $child->section === '') {
                            $sub->whereNull('section');
                        } else {
                            $sub->where('section', $child->section);
                        }
                    });
                }
            })
            ->pluck('id')
            ->all();
    }
}
