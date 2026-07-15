<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ParentStudent;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $students = Student::query()
            ->when($request->search, fn($q) => $q->where(function ($q) use ($request) {
                $q->where('first_name', 'like', "%{$request->search}%")
                  ->orWhere('last_name', 'like', "%{$request->search}%")
                  ->orWhere('student_number', 'like', "%{$request->search}%");
            }))
            ->when($request->grade_level, fn($q) => $q->where('grade_level', $request->grade_level))
            ->when($request->status,      fn($q) => $q->where('status',      $request->status))
            ->orderBy('last_name')
            ->paginate(min((int) ($request->per_page ?? 20), 500));

        return response()->json($students);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'first_name'      => 'required|string|max:100',
            'last_name'       => 'required|string|max:100',
            'student_number'  => 'nullable|string|max:50',
            'email'           => 'nullable|email|max:150',
            'phone'           => 'nullable|string|max:20',
            'date_of_birth'   => 'nullable|date',
            'grade_level'     => 'required|string|max:50',
            'section'         => 'nullable|string|max:50',
            'parent_name'     => 'nullable|string|max:150',
            'parent_phone'    => 'nullable|string|max:20',
            'parent_email'    => 'nullable|email|max:150',
            'enrollment_date' => 'nullable|date',
            'status'          => 'nullable|in:active,inactive,transferred,graduated',
        ]);

        return response()->json(Student::create($data), 201);
    }

    public function show(Student $student)
    {
        return response()->json($student->load(['grades.subject', 'attendance.subject']));
    }

    public function update(Request $request, Student $student)
    {
        $data = $request->validate([
            'first_name'      => 'sometimes|string|max:100',
            'last_name'       => 'sometimes|string|max:100',
            'student_number'  => 'nullable|string|max:50',
            'email'           => 'nullable|email|max:150',
            'phone'           => 'nullable|string|max:20',
            'date_of_birth'   => 'nullable|date',
            'grade_level'     => 'sometimes|string|max:50',
            'section'         => 'nullable|string|max:50',
            'parent_name'     => 'nullable|string|max:150',
            'parent_phone'    => 'nullable|string|max:20',
            'parent_email'    => 'nullable|email|max:150',
            'enrollment_date' => 'nullable|date',
            'status'          => 'nullable|in:active,inactive,transferred,graduated',
        ]);

        $student->update($data);

        return response()->json($student);
    }

    public function destroy(Student $student)
    {
        $student->delete(); // soft delete — recoverable by admin
        return response()->json(['message' => 'Student deleted.']);
    }

    public function restore(int $id, Request $request)
    {
        $student = Student::withTrashed()
            ->where('id', $id)
            ->where('school_id', $request->user()->school_id)
            ->firstOrFail();

        $student->restore();

        return response()->json($student);
    }

    // ── Parent linking ────────────────────────────────────────────────────────

    public function linkParent(Request $request, Student $student)
    {
        $schoolId = $request->user()->school_id;

        $data = $request->validate([
            'user_id'            => ['required', Rule::exists('users', 'id')->where('school_id', $schoolId)],
            'relationship'       => 'nullable|string|max:100',
            'is_primary_contact' => 'nullable|boolean',
            'can_receive_sms'    => 'nullable|boolean',
            'can_receive_email'  => 'nullable|boolean',
        ]);

        $parent = User::findOrFail($data['user_id']);

        abort_if($parent->role !== 'parent',       422, 'The user must have the parent role.');
        abort_if($parent->school_id !== $schoolId, 403, 'User does not belong to this school.');

        // Check for an existing (possibly soft-deleted) pivot link
        $existing = ParentStudent::withoutTenantScope()
            ->withTrashed()
            ->where('school_id',      $schoolId)
            ->where('parent_user_id', $parent->id)
            ->where('student_id',     $student->id)
            ->first();

        if ($existing && !$existing->trashed()) {
            // Already linked and active — return current state
            return response()->json($student->load('parentUser', 'parents'));
        }

        $linkData = [
            'relationship'       => $data['relationship']       ?? null,
            'is_primary_contact' => $data['is_primary_contact'] ?? false,
            'can_receive_sms'    => $data['can_receive_sms']    ?? true,
            'can_receive_email'  => $data['can_receive_email']  ?? true,
        ];

        if ($existing && $existing->trashed()) {
            // Restore previously removed link
            $existing->restore();
            $existing->update($linkData);
        } else {
            ParentStudent::create(array_merge($linkData, [
                'school_id'      => $schoolId,
                'parent_user_id' => $parent->id,
                'student_id'     => $student->id,
            ]));
        }

        // Keep students.parent_user_id in sync with the primary contact
        if (!empty($data['is_primary_contact'])) {
            $student->update(['parent_user_id' => $parent->id]);
        } elseif ($student->parent_user_id === null) {
            // First link defaults to primary contact for backward compatibility
            $student->update(['parent_user_id' => $parent->id]);
        }

        return response()->json($student->fresh()->load('parentUser', 'parents'));
    }

    public function unlinkParent(Request $request, Student $student)
    {
        $schoolId = $request->user()->school_id;

        $data = $request->validate([
            'user_id' => ['nullable', Rule::exists('users', 'id')->where('school_id', $schoolId)],
        ]);

        if (isset($data['user_id'])) {
            // Unlink a specific parent
            $link = ParentStudent::withoutTenantScope()
                ->where('school_id',      $schoolId)
                ->where('parent_user_id', $data['user_id'])
                ->where('student_id',     $student->id)
                ->first();

            if ($link) {
                $link->delete(); // soft delete
            }

            // If the unlinked parent was the legacy primary contact, clear it
            if ($student->parent_user_id == $data['user_id']) {
                // Set to next active primary contact, or null if none
                $next = ParentStudent::withoutTenantScope()
                    ->where('school_id',  $schoolId)
                    ->where('student_id', $student->id)
                    ->where('is_primary_contact', true)
                    ->where('parent_user_id', '!=', $data['user_id'])
                    ->first();

                $student->update(['parent_user_id' => $next?->parent_user_id]);
            }
        } else {
            // No user_id: unlink all parents (legacy single-unlink behavior)
            ParentStudent::withoutTenantScope()
                ->where('school_id',  $schoolId)
                ->where('student_id', $student->id)
                ->delete();

            $student->update(['parent_user_id' => null]);
        }

        return response()->json($student->fresh());
    }
}
