<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TeacherAvailability;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TeacherAvailabilityController extends Controller
{
    private const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    public function index(Request $request)
    {
        $request->validate([
            'teacher_user_id'     => 'nullable|integer',
            'day_of_week'         => ['nullable', Rule::in(self::DAYS)],
            'period_id'           => 'nullable|integer',
            'availability_status' => 'nullable|in:available,unavailable,preferred',
            'per_page'            => 'nullable|integer|min:1|max:100',
        ]);

        $user = $request->user();

        $query = TeacherAvailability::with(['teacher', 'period'])
            ->when($request->day_of_week,         fn($q) => $q->where('day_of_week', $request->day_of_week))
            ->when($request->period_id,           fn($q) => $q->where('period_id', $request->period_id))
            ->when($request->availability_status, fn($q) => $q->where('availability_status', $request->availability_status))
            ->orderBy('day_of_week')
            ->orderBy('period_id');

        // Teachers may only view their own availability; admins may filter by teacher.
        if ($user->isAdmin()) {
            $query->when($request->teacher_user_id, fn($q) => $q->where('teacher_user_id', $request->teacher_user_id));
        } else {
            $query->where('teacher_user_id', $user->id);
        }

        return response()->json($query->paginate((int) ($request->per_page ?? 50)));
    }

    public function store(Request $request)
    {
        $user     = $request->user();
        $schoolId = $user->school_id;

        $data = $request->validate([
            'teacher_user_id'     => ['required', Rule::exists('users', 'id')->where('school_id', $schoolId)->where('role', 'teacher')],
            'day_of_week'         => ['required', Rule::in(self::DAYS)],
            'period_id'           => ['required', Rule::exists('timetable_periods', 'id')->where('school_id', $schoolId)],
            'availability_status' => 'required|in:available,unavailable,preferred',
            'reason'              => 'nullable|string|max:255',
        ]);

        // Teachers may only manage their OWN availability.
        if (!$user->isAdmin()) {
            abort_unless(
                (int) $data['teacher_user_id'] === $user->id,
                403,
                'You can only manage your own availability.'
            );
        }

        $availability = TeacherAvailability::create($data);

        // Observer handles 'created' audit log.

        return response()->json($availability->load(['teacher', 'period']), 201);
    }

    public function update(Request $request, TeacherAvailability $teacherAvailability)
    {
        $user     = $request->user();
        $schoolId = $user->school_id;

        if (!$user->isAdmin()) {
            abort_unless(
                $teacherAvailability->teacher_user_id === $user->id,
                403,
                'You can only manage your own availability.'
            );
        }

        $data = $request->validate([
            'day_of_week'         => ['sometimes', Rule::in(self::DAYS)],
            'period_id'           => ['sometimes', Rule::exists('timetable_periods', 'id')->where('school_id', $schoolId)],
            'availability_status' => 'sometimes|in:available,unavailable,preferred',
            'reason'              => 'nullable|string|max:255',
        ]);

        $teacherAvailability->update($data);

        // Observer handles 'updated' audit log.

        return response()->json($teacherAvailability->fresh()->load(['teacher', 'period']));
    }

    public function destroy(Request $request, TeacherAvailability $teacherAvailability)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            abort_unless(
                $teacherAvailability->teacher_user_id === $user->id,
                403,
                'You can only manage your own availability.'
            );
        }

        // Observer handles 'deleted' audit log.
        $teacherAvailability->delete();

        return response()->json(['message' => 'Availability deleted.']);
    }

    public function restore(int $id, Request $request)
    {
        $user = $request->user();

        // Tenant-scoped lookup of the trashed record (global tenant scope + explicit where).
        $availability = TeacherAvailability::withTrashed()
            ->where('id', $id)
            ->where('school_id', $user->school_id)
            ->firstOrFail();

        // Teachers may only manage their OWN availability (same rule as destroy).
        if (!$user->isAdmin()) {
            abort_unless(
                $availability->teacher_user_id === $user->id,
                403,
                'You can only manage your own availability.'
            );
        }

        $availability->restore();

        // Observer handles 'restored' audit log.

        return response()->json($availability->load(['teacher', 'period']));
    }
}
