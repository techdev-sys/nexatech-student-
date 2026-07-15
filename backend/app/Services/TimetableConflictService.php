<?php

namespace App\Services;

use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\TeacherAvailability;
use App\Models\TimetableEntry;
use App\Models\TimetablePeriod;
use App\Models\TimetableRoom;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * Server-side timetable conflict detection.
 *
 * Slot-occupancy conflicts (class / teacher / room) and teacher availability are
 * only enforced when the entry being saved is itself 'active' — draft and cancelled
 * entries neither cause nor suffer slot conflicts. Existing entries are only counted
 * as occupying a slot when they are 'active' and not soft-deleted.
 *
 * Resource-validity conflicts (inactive period / room / subject) are always enforced.
 */
class TimetableConflictService
{
    /**
     * @param  array     $data      Entry attributes (school_id, class_id, subject_id, teacher_user_id, room_id, period_id, day_of_week, academic_year, term, status)
     * @param  int|null  $ignoreId  Entry id to exclude (the one being updated/restored)
     * @throws ValidationException
     */
    public function assertNoConflicts(array $data, ?int $ignoreId = null): void
    {
        $this->assertResourcesActive($data);

        // Only an active entry occupies a slot.
        if (($data['status'] ?? 'active') !== 'active') {
            return;
        }

        $this->assertClassFree($data, $ignoreId);
        $this->assertTeacherFree($data, $ignoreId);
        $this->assertRoomFree($data, $ignoreId);
        $this->assertTeacherAvailable($data);
    }

    // ── Resource validity (always enforced) ───────────────────────────────────

    private function assertResourcesActive(array $data): void
    {
        $period = TimetablePeriod::find($data['period_id'] ?? null);
        if ($period && !$period->is_active) {
            $this->fail('period_id', "Period '{$period->name}' is inactive and cannot be scheduled.");
        }

        if (!empty($data['room_id'])) {
            $room = TimetableRoom::find($data['room_id']);
            if ($room && !$room->is_active) {
                $this->fail('room_id', "Room '{$room->name}' is inactive and cannot be booked.");
            }
        }

        // Subjects only carry an is_active flag if a future migration adds one.
        if (!empty($data['subject_id']) && Schema::hasColumn('subjects', 'is_active')) {
            $subject = Subject::find($data['subject_id']);
            if ($subject && isset($subject->is_active) && !$subject->is_active) {
                $this->fail('subject_id', "Subject '{$subject->name}' is inactive and cannot be scheduled.");
            }
        }
    }

    // ── Slot occupancy (only when saving an active entry) ─────────────────────

    private function assertClassFree(array $data, ?int $ignoreId): void
    {
        $conflict = $this->slotQuery($data, $ignoreId)
            ->where('class_id', $data['class_id'])
            ->with('subject')
            ->first();

        if ($conflict) {
            $subjectName = $conflict->subject?->name ?? 'another subject';
            $this->fail('class_id', "This class already has {$subjectName} scheduled during {$this->slotLabel($data)}.");
        }
    }

    private function assertTeacherFree(array $data, ?int $ignoreId): void
    {
        $conflict = $this->slotQuery($data, $ignoreId)
            ->where('teacher_user_id', $data['teacher_user_id'])
            ->with('schoolClass')
            ->first();

        if ($conflict) {
            $className = $conflict->schoolClass?->name ?? 'another class';
            $this->fail('teacher_user_id', "This teacher is already assigned to {$className} during {$this->slotLabel($data)}.");
        }
    }

    private function assertRoomFree(array $data, ?int $ignoreId): void
    {
        if (empty($data['room_id'])) {
            return;
        }

        $conflict = $this->slotQuery($data, $ignoreId)
            ->where('room_id', $data['room_id'])
            ->with('room')
            ->first();

        if ($conflict) {
            $roomName = $conflict->room?->name ?? 'This room';
            $this->fail('room_id', "{$roomName} is already booked during {$this->slotLabel($data)}.");
        }
    }

    private function assertTeacherAvailable(array $data): void
    {
        $unavailable = TeacherAvailability::where('teacher_user_id', $data['teacher_user_id'])
            ->where('day_of_week', $data['day_of_week'])
            ->where('period_id', $data['period_id'])
            ->where('availability_status', 'unavailable')
            ->exists();

        if ($unavailable) {
            $this->fail('teacher_user_id', "This teacher is marked unavailable during {$this->slotLabel($data)}.");
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Base query for active, non-deleted entries occupying the same slot
     * (school, day, period, academic_year, term), excluding the entry under edit.
     */
    private function slotQuery(array $data, ?int $ignoreId)
    {
        return TimetableEntry::query()
            ->where('status', 'active')
            ->where('day_of_week', $data['day_of_week'])
            ->where('period_id', $data['period_id'])
            ->where('academic_year', $data['academic_year'])
            ->where('term', $data['term'])
            ->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId));
    }

    private function slotLabel(array $data): string
    {
        $day    = ucfirst($data['day_of_week']);
        $period = TimetablePeriod::find($data['period_id'] ?? null);
        $name   = $period?->name ?? 'the selected period';

        return "{$day} {$name}";
    }

    private function fail(string $field, string $message): void
    {
        throw ValidationException::withMessages([$field => [$message]]);
    }
}
