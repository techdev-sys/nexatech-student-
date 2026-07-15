<?php

namespace App\Services;

use App\Models\ExamTimetable;
use Illuminate\Validation\ValidationException;

/**
 * Detects scheduling conflicts for exam timetable entries.
 *
 * Conflicts are time-overlap based (date + start/end time) rather than period-slot based.
 * Time overlap exists when: start1 < end2 AND end1 > start2
 */
class ExamConflictService
{
    /**
     * @param  array    $data      Attributes including school_id, class_id, subject_id, room_id,
     *                             supervisor_user_id, exam_date, start_time, end_time
     * @param  int|null $ignoreId  ExamTimetable id to exclude (when updating)
     * @throws ValidationException
     */
    public function assertNoConflicts(array $data, ?int $ignoreId = null): void
    {
        $this->assertClassFree($data, $ignoreId);
        $this->assertSupervisorFree($data, $ignoreId);
        $this->assertRoomFree($data, $ignoreId);
    }

    private function assertClassFree(array $data, ?int $ignoreId): void
    {
        $conflict = $this->overlapQuery($data, $ignoreId)
            ->where('class_id', $data['class_id'])
            ->with('subject')
            ->first();

        if ($conflict) {
            $subjectName = $conflict->subject?->name ?? 'another exam';
            $this->fail('class_id', "This class already has '{$subjectName}' scheduled during the requested time slot on {$data['exam_date']}.");
        }
    }

    private function assertSupervisorFree(array $data, ?int $ignoreId): void
    {
        if (empty($data['supervisor_user_id'])) {
            return;
        }

        $conflict = $this->overlapQuery($data, $ignoreId)
            ->where('supervisor_user_id', $data['supervisor_user_id'])
            ->with('schoolClass')
            ->first();

        if ($conflict) {
            $className = $conflict->schoolClass?->name ?? 'another class';
            $this->fail('supervisor_user_id', "This supervisor is already assigned to {$className} during the requested time slot on {$data['exam_date']}.");
        }
    }

    private function assertRoomFree(array $data, ?int $ignoreId): void
    {
        if (empty($data['room_id'])) {
            return;
        }

        $conflict = $this->overlapQuery($data, $ignoreId)
            ->where('room_id', $data['room_id'])
            ->with('room')
            ->first();

        if ($conflict) {
            $roomName = $conflict->room?->name ?? 'This room';
            $this->fail('room_id', "{$roomName} is already booked during the requested time slot on {$data['exam_date']}.");
        }
    }

    /**
     * Base query: non-deleted entries on the same date that overlap in time.
     * Overlap condition: start1 < end2 AND end1 > start2
     */
    private function overlapQuery(array $data, ?int $ignoreId)
    {
        return ExamTimetable::withoutGlobalScope('tenant')
            ->where('school_id', $data['school_id'])
            ->where('exam_date', $data['exam_date'])
            ->where('start_time', '<', $data['end_time'])
            ->where('end_time', '>', $data['start_time'])
            ->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId));
    }

    private function fail(string $field, string $message): void
    {
        throw ValidationException::withMessages([$field => [$message]]);
    }
}
