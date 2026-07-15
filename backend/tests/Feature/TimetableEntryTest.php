<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\TeacherAvailability;
use App\Models\TimetableEntry;
use App\Models\TimetablePeriod;
use App\Models\TimetableRoom;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class TimetableEntryTest extends TestCase
{
    use DatabaseTransactions;

    private int $seq = 0;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function school(): School
    {
        return School::factory()->create();
    }

    private function adminUser(School $school): User
    {
        return User::factory()->admin()->forSchool($school->id)->create();
    }

    private function teacherUser(School $school): User
    {
        return User::factory()->teacher()->forSchool($school->id)->create();
    }

    private function parentUser(School $school): User
    {
        return User::factory()->asParent()->forSchool($school->id)->create();
    }

    private function classFor(School $school, array $o = []): SchoolClass
    {
        $this->seq++;
        return SchoolClass::create(array_merge([
            'school_id' => $school->id, 'name' => "Class {$this->seq}", 'grade_level' => 'Grade 8', 'section' => 'A',
        ], $o));
    }

    private function subjectFor(School $school, array $o = []): Subject
    {
        $this->seq++;
        return Subject::create(array_merge([
            'school_id' => $school->id, 'name' => "Subject {$this->seq}", 'code' => "S{$this->seq}",
        ], $o));
    }

    private function periodFor(School $school, array $o = []): TimetablePeriod
    {
        return TimetablePeriod::factory()->create(array_merge(['school_id' => $school->id], $o));
    }

    private function roomFor(School $school, array $o = []): TimetableRoom
    {
        return TimetableRoom::factory()->create(array_merge(['school_id' => $school->id], $o));
    }

    /** Build a valid create payload, creating ONLY the related resources not supplied in $o. */
    private function payload(School $school, array $o = []): array
    {
        $base = [
            'day_of_week'   => 'monday',
            'academic_year' => '2026',
            'term'          => 'Term 1',
            'status'        => 'active',
        ];
        $base['class_id']        = $o['class_id']        ?? $this->classFor($school)->id;
        $base['subject_id']      = $o['subject_id']      ?? $this->subjectFor($school)->id;
        $base['teacher_user_id'] = $o['teacher_user_id'] ?? $this->teacherUser($school)->id;
        $base['period_id']       = $o['period_id']       ?? $this->periodFor($school)->id;

        return array_merge($base, $o);
    }

    /** Persist an entry row directly (bypassing the API), filling related resources. */
    private function persistEntry(School $school, array $o = []): TimetableEntry
    {
        return TimetableEntry::create(array_merge(['school_id' => $school->id], $this->payload($school, $o)));
    }

    // ── Authorization ─────────────────────────────────────────────────────────

    public function test_parent_cannot_create_entry(): void
    {
        // (No 'accountant' role exists in this system; parent is the unprivileged stand-in.)
        $school = $this->school();

        $this->actingAs($this->parentUser($school))
            ->postJson('/api/timetable/entries', $this->payload($school))
            ->assertStatus(403);
    }

    public function test_parent_cannot_list_entries(): void
    {
        $school = $this->school();

        $this->actingAs($this->parentUser($school))
            ->getJson('/api/timetable/entries')
            ->assertStatus(403);
    }

    public function test_admin_can_create_entry(): void
    {
        $school = $this->school();

        $this->actingAs($this->adminUser($school))
            ->postJson('/api/timetable/entries', $this->payload($school))
            ->assertCreated()
            ->assertJsonPath('status', 'active');
    }

    public function test_teacher_cannot_create_entry(): void
    {
        // Convention: scheduling writes are admin-only.
        $school = $this->school();

        $this->actingAs($this->teacherUser($school))
            ->postJson('/api/timetable/entries', $this->payload($school))
            ->assertStatus(403);
    }

    // ── Tenant isolation ──────────────────────────────────────────────────────

    public function test_cross_school_class_id_rejected(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $payload = $this->payload($schoolA, ['class_id' => $this->classFor($schoolB)->id]);

        $this->actingAs($this->adminUser($schoolA))
            ->postJson('/api/timetable/entries', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('class_id');
    }

    public function test_cross_school_subject_id_rejected(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $payload = $this->payload($schoolA, ['subject_id' => $this->subjectFor($schoolB)->id]);

        $this->actingAs($this->adminUser($schoolA))
            ->postJson('/api/timetable/entries', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('subject_id');
    }

    public function test_cross_school_teacher_id_rejected(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $payload = $this->payload($schoolA, ['teacher_user_id' => $this->teacherUser($schoolB)->id]);

        $this->actingAs($this->adminUser($schoolA))
            ->postJson('/api/timetable/entries', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('teacher_user_id');
    }

    public function test_cross_school_room_id_rejected(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $payload = $this->payload($schoolA, ['room_id' => $this->roomFor($schoolB)->id]);

        $this->actingAs($this->adminUser($schoolA))
            ->postJson('/api/timetable/entries', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('room_id');
    }

    public function test_cross_school_period_id_rejected(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $payload = $this->payload($schoolA, ['period_id' => $this->periodFor($schoolB)->id]);

        $this->actingAs($this->adminUser($schoolA))
            ->postJson('/api/timetable/entries', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('period_id');
    }

    public function test_platform_admin_without_school_cannot_list_entries(): void
    {
        $platformAdmin = User::factory()->platformAdmin()->create();

        $this->actingAs($platformAdmin)
            ->getJson('/api/timetable/entries')
            ->assertStatus(403);
    }

    public function test_school_a_admin_cannot_see_school_b_entries(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $this->persistEntry($schoolB);

        $response = $this->actingAs($this->adminUser($schoolA))
            ->getJson('/api/timetable/entries')
            ->assertOk();

        $this->assertEmpty($response->json('data'));
    }

    // ── Conflict detection ────────────────────────────────────────────────────

    public function test_class_conflict_blocked(): void
    {
        $school  = $this->school();
        $class   = $this->classFor($school);
        $period  = $this->periodFor($school);

        // Existing active entry occupying this class/day/period.
        $this->persistEntry($school, [
            'class_id' => $class->id, 'period_id' => $period->id,
            'subject_id' => $this->subjectFor($school, ['name' => 'English', 'code' => 'ENG'])->id,
        ]);

        $payload = $this->payload($school, ['class_id' => $class->id, 'period_id' => $period->id]);

        $this->actingAs($this->adminUser($school))
            ->postJson('/api/timetable/entries', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('class_id');
    }

    public function test_teacher_conflict_blocked(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);
        $period  = $this->periodFor($school);

        $this->persistEntry($school, ['teacher_user_id' => $teacher->id, 'period_id' => $period->id]);

        // Different class, same teacher/day/period.
        $payload = $this->payload($school, [
            'teacher_user_id' => $teacher->id, 'period_id' => $period->id,
        ]);

        $this->actingAs($this->adminUser($school))
            ->postJson('/api/timetable/entries', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('teacher_user_id');
    }

    public function test_room_conflict_blocked(): void
    {
        $school = $this->school();
        $room   = $this->roomFor($school);
        $period = $this->periodFor($school);

        $this->persistEntry($school, ['room_id' => $room->id, 'period_id' => $period->id]);

        $payload = $this->payload($school, ['room_id' => $room->id, 'period_id' => $period->id]);

        $this->actingAs($this->adminUser($school))
            ->postJson('/api/timetable/entries', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('room_id');
    }

    public function test_unavailable_teacher_blocked(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);
        $period  = $this->periodFor($school);

        TeacherAvailability::create([
            'school_id' => $school->id, 'teacher_user_id' => $teacher->id,
            'day_of_week' => 'monday', 'period_id' => $period->id,
            'availability_status' => 'unavailable',
        ]);

        $payload = $this->payload($school, [
            'teacher_user_id' => $teacher->id, 'period_id' => $period->id, 'day_of_week' => 'monday',
        ]);

        $this->actingAs($this->adminUser($school))
            ->postJson('/api/timetable/entries', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('teacher_user_id');
    }

    public function test_inactive_period_blocked(): void
    {
        $school = $this->school();
        $period = $this->periodFor($school, ['is_active' => false]);

        $payload = $this->payload($school, ['period_id' => $period->id]);

        $this->actingAs($this->adminUser($school))
            ->postJson('/api/timetable/entries', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('period_id');
    }

    public function test_inactive_room_blocked(): void
    {
        $school = $this->school();
        $room   = $this->roomFor($school, ['is_active' => false]);

        $payload = $this->payload($school, ['room_id' => $room->id]);

        $this->actingAs($this->adminUser($school))
            ->postJson('/api/timetable/entries', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('room_id');
    }

    public function test_subject_is_active_rule_not_applicable_no_column(): void
    {
        // Documents schema reality: subjects has no is_active column, so the
        // "inactive subject" rule is correctly inert (and cannot block scheduling).
        $this->assertFalse(Schema::hasColumn('subjects', 'is_active'));
    }

    // ── Update conflicts ──────────────────────────────────────────────────────

    public function test_update_cannot_create_class_conflict(): void
    {
        $school = $this->school();
        $class  = $this->classFor($school);
        $p1     = $this->periodFor($school, ['sort_order' => 1]);
        $p2     = $this->periodFor($school, ['sort_order' => 2]);

        $this->persistEntry($school, ['class_id' => $class->id, 'period_id' => $p1->id]);
        $e2 = $this->persistEntry($school, ['class_id' => $class->id, 'period_id' => $p2->id]);

        // Move e2 into p1 — collides with the first entry for this class.
        $this->actingAs($this->adminUser($school))
            ->patchJson("/api/timetable/entries/{$e2->id}", ['period_id' => $p1->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('class_id');
    }

    public function test_update_cannot_create_teacher_conflict(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);
        $p1      = $this->periodFor($school, ['sort_order' => 1]);
        $p2      = $this->periodFor($school, ['sort_order' => 2]);

        $this->persistEntry($school, ['teacher_user_id' => $teacher->id, 'period_id' => $p1->id]);
        $e2 = $this->persistEntry($school, ['teacher_user_id' => $teacher->id, 'period_id' => $p2->id]);

        $this->actingAs($this->adminUser($school))
            ->patchJson("/api/timetable/entries/{$e2->id}", ['period_id' => $p1->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('teacher_user_id');
    }

    public function test_update_ignores_itself(): void
    {
        $school = $this->school();
        $entry  = $this->persistEntry($school);

        // Updating notes without moving the slot must not self-conflict.
        $this->actingAs($this->adminUser($school))
            ->patchJson("/api/timetable/entries/{$entry->id}", ['notes' => 'Double period'])
            ->assertOk()
            ->assertJsonPath('notes', 'Double period');
    }

    // ── Soft delete / restore ─────────────────────────────────────────────────

    public function test_entry_soft_delete_works(): void
    {
        $school = $this->school();
        $entry  = $this->persistEntry($school);

        $this->actingAs($this->adminUser($school))
            ->deleteJson("/api/timetable/entries/{$entry->id}")
            ->assertOk();

        $this->assertSoftDeleted('timetable_entries', ['id' => $entry->id]);
    }

    public function test_entry_restore_works(): void
    {
        $school = $this->school();
        $entry  = $this->persistEntry($school);
        $entry->delete();

        $this->actingAs($this->adminUser($school))
            ->postJson("/api/timetable/entries/{$entry->id}/restore")
            ->assertOk();

        $this->assertDatabaseHas('timetable_entries', ['id' => $entry->id, 'deleted_at' => null]);
    }

    public function test_deleted_entries_do_not_block_conflicts(): void
    {
        $school = $this->school();
        $class  = $this->classFor($school);
        $period = $this->periodFor($school);

        $deleted = $this->persistEntry($school, ['class_id' => $class->id, 'period_id' => $period->id]);
        $deleted->delete();

        $payload = $this->payload($school, ['class_id' => $class->id, 'period_id' => $period->id]);

        $this->actingAs($this->adminUser($school))
            ->postJson('/api/timetable/entries', $payload)
            ->assertCreated();
    }

    public function test_cancelled_entries_do_not_block_conflicts(): void
    {
        $school = $this->school();
        $class  = $this->classFor($school);
        $period = $this->periodFor($school);

        $this->persistEntry($school, ['class_id' => $class->id, 'period_id' => $period->id, 'status' => 'cancelled']);

        $payload = $this->payload($school, ['class_id' => $class->id, 'period_id' => $period->id]);

        $this->actingAs($this->adminUser($school))
            ->postJson('/api/timetable/entries', $payload)
            ->assertCreated();
    }

    // ── Query validation ──────────────────────────────────────────────────────

    public function test_invalid_day_of_week_rejected(): void
    {
        $school  = $this->school();
        $payload = $this->payload($school, ['day_of_week' => 'someday']);

        $this->actingAs($this->adminUser($school))
            ->postJson('/api/timetable/entries', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('day_of_week');
    }

    public function test_per_page_over_100_rejected(): void
    {
        $school = $this->school();

        $this->actingAs($this->adminUser($school))
            ->getJson('/api/timetable/entries?per_page=500')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('per_page');
    }

    public function test_invalid_status_rejected(): void
    {
        $school  = $this->school();
        $payload = $this->payload($school, ['status' => 'pending']);

        $this->actingAs($this->adminUser($school))
            ->postJson('/api/timetable/entries', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    // ── Audit logging ─────────────────────────────────────────────────────────

    public function test_entry_lifecycle_is_audited_without_duplicates(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        // Create
        $id = $this->actingAs($admin)
            ->postJson('/api/timetable/entries', $this->payload($school))
            ->assertCreated()
            ->json('id');

        $createdLogs = DB::table('activity_logs')
            ->where('model_type', TimetableEntry::class)
            ->where('model_id', $id)
            ->where('action', 'created')
            ->count();
        $this->assertEquals(1, $createdLogs, 'Expected exactly one created log (no manual duplicate).');

        // Update
        $this->actingAs($admin)
            ->patchJson("/api/timetable/entries/{$id}", ['notes' => 'Updated'])
            ->assertOk();
        $this->assertDatabaseHas('activity_logs', [
            'model_type' => TimetableEntry::class, 'model_id' => $id, 'action' => 'updated',
        ]);

        // Delete
        $this->actingAs($admin)->deleteJson("/api/timetable/entries/{$id}")->assertOk();
        $this->assertDatabaseHas('activity_logs', [
            'model_type' => TimetableEntry::class, 'model_id' => $id, 'action' => 'deleted',
        ]);

        // Restore
        $this->actingAs($admin)->postJson("/api/timetable/entries/{$id}/restore")->assertOk();
        $this->assertDatabaseHas('activity_logs', [
            'model_type' => TimetableEntry::class, 'model_id' => $id, 'action' => 'restored',
        ]);
    }
}
