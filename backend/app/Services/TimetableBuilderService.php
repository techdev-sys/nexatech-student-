<?php

namespace App\Services;

use App\Models\TimetableEntry;
use Illuminate\Support\Facades\DB;

/**
 * Orchestrates timetable entry writes. Conflict detection lives in
 * TimetableConflictService; this service composes validation → conflict
 * check → persistence inside a transaction. Controllers stay thin.
 */
class TimetableBuilderService
{
    public function __construct(private TimetableConflictService $conflicts) {}

    public function create(array $data): TimetableEntry
    {
        return DB::transaction(function () use ($data) {
            $this->conflicts->assertNoConflicts($data);

            // AuditObserver records the 'created' log.
            return TimetableEntry::create($data);
        });
    }

    public function update(TimetableEntry $entry, array $data): TimetableEntry
    {
        return DB::transaction(function () use ($entry, $data) {
            // Merge incoming changes over current values so partial updates are conflict-checked
            // against the resulting state. The entry itself is excluded via its id.
            $merged = array_merge($entry->only([
                'class_id', 'subject_id', 'teacher_user_id', 'room_id',
                'period_id', 'day_of_week', 'academic_year', 'term', 'status',
            ]), $data);

            $this->conflicts->assertNoConflicts($merged, $entry->id);

            // AuditObserver records the 'updated' log.
            $entry->update($data);

            return $entry->fresh();
        });
    }

    public function delete(TimetableEntry $entry): void
    {
        // AuditObserver records the 'deleted' log.
        $entry->delete();
    }

    public function restore(TimetableEntry $entry): TimetableEntry
    {
        return DB::transaction(function () use ($entry) {
            // Re-check conflicts: the slot may have been filled while this entry was deleted.
            $this->conflicts->assertNoConflicts($entry->only([
                'class_id', 'subject_id', 'teacher_user_id', 'room_id',
                'period_id', 'day_of_week', 'academic_year', 'term', 'status',
            ]), $entry->id);

            // AuditObserver records the 'restored' log.
            $entry->restore();

            return $entry;
        });
    }
}
