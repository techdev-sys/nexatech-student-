<?php

namespace App\Services;

use App\Jobs\SendCommunicationJob;
use App\Models\Communication;
use App\Models\CommunicationDelivery;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CommunicationService
{
    /**
     * Resolve the audience into a list of recipient descriptors.
     * Each item: ['user_id', 'name', 'phone', 'email']
     */
    public function resolveAudience(Communication $comm): Collection
    {
        $schoolId = $comm->school_id;
        $filter   = $comm->audience_filter_json ?? [];

        return match ($comm->audience_type) {
            'all'     => $this->allContacts($schoolId),
            'parents' => $this->usersByRole($schoolId, 'parent'),
            'teachers'=> $this->usersByRole($schoolId, 'teacher'),
            'staff'   => $this->staffContacts($schoolId),
            'class'   => $this->classParents($schoolId, $filter['class_id'] ?? null),
            'grade'   => $this->gradeParents($schoolId, $filter['grade_level'] ?? null),
            'custom'  => $this->customUsers($schoolId, $filter['user_ids'] ?? []),
            default   => collect(),
        };
    }

    /**
     * Create delivery records and dispatch the send job.
     */
    public function dispatch(Communication $comm): void
    {
        $audience = $this->resolveAudience($comm);

        if ($audience->isEmpty()) {
            $comm->update(['status' => 'failed', 'sent_at' => now()]);
            return;
        }

        DB::transaction(function () use ($comm, $audience) {
            $deliveries = $audience->map(fn($r) => [
                'school_id'          => $comm->school_id,
                'communication_id'   => $comm->id,
                'recipient_user_id'  => $r['user_id'],
                'recipient_name'     => $r['name'],
                'recipient_phone'    => $r['phone'],
                'recipient_email'    => $r['email'],
                'channel'            => $comm->channel,
                'delivery_status'    => 'pending',
                'created_at'         => now(),
                'updated_at'         => now(),
            ])->all();

            CommunicationDelivery::insert($deliveries);

            $comm->update([
                'status'           => 'processing',
                'total_recipients' => count($deliveries),
                'sent_at'          => now(),
            ]);
        });

        SendCommunicationJob::dispatch($comm)->onQueue('communications');
    }

    // ── Audience resolvers ─────────────────────────────────────────────────────

    private function allContacts(int $schoolId): Collection
    {
        return $this->usersByRoles($schoolId, ['parent', 'teacher', 'admin', 'super_admin']);
    }

    private function staffContacts(int $schoolId): Collection
    {
        return $this->usersByRoles($schoolId, ['teacher', 'admin', 'super_admin']);
    }

    private function usersByRole(int $schoolId, string $role): Collection
    {
        return User::where('school_id', $schoolId)
            ->where('role', $role)
            ->get()
            ->map(fn($u) => [
                'user_id' => $u->id,
                'name'    => $u->name,
                'phone'   => null,
                'email'   => $u->email,
            ]);
    }

    private function usersByRoles(int $schoolId, array $roles): Collection
    {
        return User::where('school_id', $schoolId)
            ->whereIn('role', $roles)
            ->get()
            ->map(fn($u) => [
                'user_id' => $u->id,
                'name'    => $u->name,
                'phone'   => null,
                'email'   => $u->email,
            ]);
    }

    private function classParents(int $schoolId, ?int $classId): Collection
    {
        if (!$classId) {
            return collect(); // class_id is required; no grade_level fallback
        }

        // Resolve the class record, scoped to this school — prevents cross-school targeting.
        $class = SchoolClass::withoutTenantScope()
            ->where('id', $classId)
            ->where('school_id', $schoolId)
            ->first();

        if (!$class) {
            return collect(); // class not found in this school
        }

        // Students belong to this class when their grade_level (and section, if the class
        // defines one) matches the class record. This is the authoritative membership
        // mechanism in this schema — there is no students.class_id FK.
        $q = Student::where('school_id', $schoolId)
            ->where('grade_level', $class->grade_level);

        if ($class->section) {
            $q->where('section', $class->section);
        }

        return $this->studentsToParentContacts($q->get());
    }

    private function gradeParents(int $schoolId, ?string $gradeLevel): Collection
    {
        $q = Student::where('school_id', $schoolId);

        if ($gradeLevel) {
            $q->where('grade_level', $gradeLevel);
        }

        return $this->studentsToParentContacts($q->get());
    }

    private function studentsToParentContacts(Collection $students): Collection
    {
        $contacts = collect();

        foreach ($students as $student) {
            // Pivot-first: get all active parent links for this student, respecting notification prefs
            $links = DB::table('parent_student')
                ->join('users', 'parent_student.parent_user_id', '=', 'users.id')
                ->where('parent_student.student_id', $student->id)
                ->where('parent_student.school_id', $student->school_id)
                ->whereNull('parent_student.deleted_at')
                ->select(
                    'users.id as user_id',
                    'users.name',
                    'users.email',
                    'parent_student.can_receive_sms',
                    'parent_student.can_receive_email',
                )
                ->get();

            if ($links->isNotEmpty()) {
                foreach ($links as $link) {
                    $contacts->push([
                        'user_id'          => $link->user_id,
                        'name'             => $link->name,
                        'phone'            => $link->can_receive_sms ? $student->parent_phone : null,
                        'email'            => $link->can_receive_email ? $link->email : null,
                    ]);
                }
                continue;
            }

            // Legacy fallback: parent_user_id FK
            if ($student->parent_user_id) {
                $parent = User::find($student->parent_user_id);
                if ($parent) {
                    $contacts->push([
                        'user_id' => $parent->id,
                        'name'    => $parent->name,
                        'phone'   => $student->parent_phone,
                        'email'   => $parent->email,
                    ]);
                    continue;
                }
            }

            // Final fallback: unlinked student contact fields
            $contacts->push([
                'user_id' => null,
                'name'    => $student->parent_name,
                'phone'   => $student->parent_phone,
                'email'   => $student->parent_email,
            ]);
        }

        return $contacts->filter(fn($r) => $r['phone'] || $r['email'])->values();
    }

    private function customUsers(int $schoolId, array $userIds): Collection
    {
        if (empty($userIds)) return collect();

        return User::where('school_id', $schoolId)
            ->whereIn('id', $userIds)
            ->get()
            ->map(fn($u) => [
                'user_id' => $u->id,
                'name'    => $u->name,
                'phone'   => null,
                'email'   => $u->email,
            ]);
    }
}
