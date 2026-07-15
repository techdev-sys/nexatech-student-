<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\TeacherAvailability;
use App\Models\TimetablePeriod;
use App\Models\TimetableRoom;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TimetableFoundationTest extends TestCase
{
    use DatabaseTransactions;

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

    private function periodFor(School $school, array $overrides = []): TimetablePeriod
    {
        return TimetablePeriod::factory()->create(array_merge(['school_id' => $school->id], $overrides));
    }

    private function roomFor(School $school, array $overrides = []): TimetableRoom
    {
        return TimetableRoom::factory()->create(array_merge(['school_id' => $school->id], $overrides));
    }

    private function availabilityFor(School $school, User $teacher, TimetablePeriod $period, array $overrides = []): TeacherAvailability
    {
        return TeacherAvailability::factory()->create(array_merge([
            'school_id'       => $school->id,
            'teacher_user_id' => $teacher->id,
            'period_id'       => $period->id,
        ], $overrides));
    }

    // ── Authorization ─────────────────────────────────────────────────────────

    public function test_teacher_can_view_periods(): void
    {
        $school = $this->school();
        $this->periodFor($school);

        $this->actingAs($this->teacherUser($school))
            ->getJson('/api/timetable/periods')
            ->assertOk();
    }

    public function test_teacher_cannot_create_period(): void
    {
        $school = $this->school();

        $this->actingAs($this->teacherUser($school))
            ->postJson('/api/timetable/periods', [
                'name' => 'Period 1', 'starts_at' => '07:30', 'ends_at' => '08:10',
            ])
            ->assertStatus(403);
    }

    public function test_parent_cannot_view_periods(): void
    {
        $school = $this->school();

        $this->actingAs($this->parentUser($school))
            ->getJson('/api/timetable/periods')
            ->assertStatus(403);
    }

    public function test_platform_admin_without_school_cannot_see_periods(): void
    {
        $platformAdmin = User::factory()->platformAdmin()->create();

        $this->actingAs($platformAdmin)
            ->getJson('/api/timetable/periods')
            ->assertStatus(403);
    }

    public function test_admin_can_manage_periods(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        $created = $this->actingAs($admin)
            ->postJson('/api/timetable/periods', [
                'name' => 'Period 1', 'starts_at' => '07:30', 'ends_at' => '08:10',
                'sort_order' => 1, 'is_break' => false, 'is_active' => true,
            ])
            ->assertCreated()
            ->json('id');

        $this->actingAs($admin)
            ->patchJson("/api/timetable/periods/{$created}", ['name' => 'Updated Period'])
            ->assertOk()
            ->assertJsonPath('name', 'Updated Period');

        $this->actingAs($admin)
            ->deleteJson("/api/timetable/periods/{$created}")
            ->assertOk();

        $this->assertSoftDeleted('timetable_periods', ['id' => $created]);
    }

    public function test_admin_can_create_room(): void
    {
        $school = $this->school();

        $this->actingAs($this->adminUser($school))
            ->postJson('/api/timetable/rooms', [
                'name' => 'Science Lab A', 'code' => 'LAB-A',
                'capacity' => 40, 'room_type' => 'laboratory', 'is_active' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('room_type', 'laboratory');
    }

    public function test_teacher_cannot_create_room(): void
    {
        $school = $this->school();

        $this->actingAs($this->teacherUser($school))
            ->postJson('/api/timetable/rooms', ['name' => 'Room 9'])
            ->assertStatus(403);
    }

    // ── Tenant isolation ──────────────────────────────────────────────────────

    public function test_school_a_admin_cannot_see_school_b_periods(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $this->periodFor($schoolB);

        $response = $this->actingAs($this->adminUser($schoolA))
            ->getJson('/api/timetable/periods')
            ->assertOk();

        $this->assertEmpty($response->json('data'));
    }

    public function test_school_a_admin_cannot_update_school_b_period(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $periodB = $this->periodFor($schoolB);

        // Tenant global scope hides the record → route-model binding 404s
        $this->actingAs($this->adminUser($schoolA))
            ->patchJson("/api/timetable/periods/{$periodB->id}", ['name' => 'Hacked'])
            ->assertNotFound();
    }

    public function test_availability_rejects_cross_school_teacher(): void
    {
        $schoolA  = $this->school();
        $schoolB  = $this->school();
        $adminA   = $this->adminUser($schoolA);
        $teacherB = $this->teacherUser($schoolB);
        $periodA  = $this->periodFor($schoolA);

        $this->actingAs($adminA)
            ->postJson('/api/timetable/teacher-availability', [
                'teacher_user_id'     => $teacherB->id,
                'day_of_week'         => 'monday',
                'period_id'           => $periodA->id,
                'availability_status' => 'unavailable',
            ])
            ->assertUnprocessable();
    }

    public function test_availability_rejects_cross_school_period(): void
    {
        $schoolA   = $this->school();
        $schoolB   = $this->school();
        $adminA    = $this->adminUser($schoolA);
        $teacherA  = $this->teacherUser($schoolA);
        $periodB   = $this->periodFor($schoolB);

        $this->actingAs($adminA)
            ->postJson('/api/timetable/teacher-availability', [
                'teacher_user_id'     => $teacherA->id,
                'day_of_week'         => 'monday',
                'period_id'           => $periodB->id,
                'availability_status' => 'unavailable',
            ])
            ->assertUnprocessable();
    }

    // ── Validation ────────────────────────────────────────────────────────────

    public function test_invalid_time_format_rejected(): void
    {
        $school = $this->school();

        $this->actingAs($this->adminUser($school))
            ->postJson('/api/timetable/periods', [
                'name' => 'Bad', 'starts_at' => '7:30 AM', 'ends_at' => '08:10',
            ])
            ->assertUnprocessable();
    }

    public function test_end_time_must_be_after_start_time(): void
    {
        $school = $this->school();

        $this->actingAs($this->adminUser($school))
            ->postJson('/api/timetable/periods', [
                'name' => 'Bad', 'starts_at' => '09:00', 'ends_at' => '08:00',
            ])
            ->assertUnprocessable();
    }

    public function test_per_page_over_100_rejected(): void
    {
        $school = $this->school();

        $this->actingAs($this->adminUser($school))
            ->getJson('/api/timetable/periods?per_page=500')
            ->assertUnprocessable();
    }

    public function test_availability_invalid_day_of_week_rejected(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $teacher = $this->teacherUser($school);
        $period  = $this->periodFor($school);

        $this->actingAs($admin)
            ->postJson('/api/timetable/teacher-availability', [
                'teacher_user_id'     => $teacher->id,
                'day_of_week'         => 'someday',
                'period_id'           => $period->id,
                'availability_status' => 'available',
            ])
            ->assertUnprocessable();
    }

    // ── Soft delete / restore ─────────────────────────────────────────────────

    public function test_period_soft_delete_and_restore(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);
        $period = $this->periodFor($school);

        $this->actingAs($admin)->deleteJson("/api/timetable/periods/{$period->id}")->assertOk();
        $this->assertSoftDeleted('timetable_periods', ['id' => $period->id]);

        $this->actingAs($admin)->postJson("/api/timetable/periods/{$period->id}/restore")->assertOk();
        $this->assertDatabaseHas('timetable_periods', ['id' => $period->id, 'deleted_at' => null]);
    }

    public function test_room_soft_delete_and_restore(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);
        $room   = $this->roomFor($school);

        $this->actingAs($admin)->deleteJson("/api/timetable/rooms/{$room->id}")->assertOk();
        $this->assertSoftDeleted('timetable_rooms', ['id' => $room->id]);

        $this->actingAs($admin)->postJson("/api/timetable/rooms/{$room->id}/restore")->assertOk();
        $this->assertDatabaseHas('timetable_rooms', ['id' => $room->id, 'deleted_at' => null]);
    }

    // ── Teacher availability self-management ──────────────────────────────────

    public function test_teacher_can_create_own_availability(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);
        $period  = $this->periodFor($school);

        $this->actingAs($teacher)
            ->postJson('/api/timetable/teacher-availability', [
                'teacher_user_id'     => $teacher->id,
                'day_of_week'         => 'monday',
                'period_id'           => $period->id,
                'availability_status' => 'unavailable',
                'reason'              => 'Department meeting',
            ])
            ->assertCreated();
    }

    public function test_teacher_cannot_create_availability_for_another_teacher(): void
    {
        $school   = $this->school();
        $teacherA = $this->teacherUser($school);
        $teacherB = $this->teacherUser($school);
        $period   = $this->periodFor($school);

        $this->actingAs($teacherA)
            ->postJson('/api/timetable/teacher-availability', [
                'teacher_user_id'     => $teacherB->id,
                'day_of_week'         => 'monday',
                'period_id'           => $period->id,
                'availability_status' => 'unavailable',
            ])
            ->assertStatus(403);
    }

    public function test_admin_can_create_availability_for_any_teacher(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $teacher = $this->teacherUser($school);
        $period  = $this->periodFor($school);

        $this->actingAs($admin)
            ->postJson('/api/timetable/teacher-availability', [
                'teacher_user_id'     => $teacher->id,
                'day_of_week'         => 'tuesday',
                'period_id'           => $period->id,
                'availability_status' => 'preferred',
            ])
            ->assertCreated();
    }

    public function test_teacher_sees_only_own_availability(): void
    {
        $school   = $this->school();
        $teacherA = $this->teacherUser($school);
        $teacherB = $this->teacherUser($school);
        $period   = $this->periodFor($school);

        $this->availabilityFor($school, $teacherA, $period, ['day_of_week' => 'monday']);
        $this->availabilityFor($school, $teacherB, $period, ['day_of_week' => 'tuesday']);

        $response = $this->actingAs($teacherA)
            ->getJson('/api/timetable/teacher-availability')
            ->assertOk();

        $teacherIds = collect($response->json('data'))->pluck('teacher_user_id')->unique()->all();
        $this->assertEquals([$teacherA->id], $teacherIds);
    }

    public function test_teacher_cannot_delete_another_teachers_availability(): void
    {
        $school   = $this->school();
        $teacherA = $this->teacherUser($school);
        $teacherB = $this->teacherUser($school);
        $period   = $this->periodFor($school);
        $avB      = $this->availabilityFor($school, $teacherB, $period);

        $this->actingAs($teacherA)
            ->deleteJson("/api/timetable/teacher-availability/{$avB->id}")
            ->assertStatus(403);
    }

    public function test_admin_can_restore_soft_deleted_availability(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $teacher = $this->teacherUser($school);
        $period  = $this->periodFor($school);
        $av      = $this->availabilityFor($school, $teacher, $period);
        $av->delete();

        $this->actingAs($admin)
            ->postJson("/api/timetable/teacher-availability/{$av->id}/restore")
            ->assertOk();

        $this->assertDatabaseHas('teacher_availabilities', ['id' => $av->id, 'deleted_at' => null]);
    }

    public function test_school_a_cannot_restore_school_b_availability(): void
    {
        $schoolA  = $this->school();
        $schoolB  = $this->school();
        $adminA   = $this->adminUser($schoolA);
        $teacherB = $this->teacherUser($schoolB);
        $periodB  = $this->periodFor($schoolB);
        $avB      = $this->availabilityFor($schoolB, $teacherB, $periodB);
        $avB->delete();

        // Tenant-scoped lookup hides School B's record → 404, and it stays trashed.
        $this->actingAs($adminA)
            ->postJson("/api/timetable/teacher-availability/{$avB->id}/restore")
            ->assertNotFound();

        $this->assertSoftDeleted('teacher_availabilities', ['id' => $avB->id]);
    }

    // ── Audit logging ─────────────────────────────────────────────────────────

    public function test_period_create_is_audited(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        $id = $this->actingAs($admin)
            ->postJson('/api/timetable/periods', [
                'name' => 'Audited Period', 'starts_at' => '07:30', 'ends_at' => '08:10',
            ])
            ->json('id');

        $this->assertDatabaseHas('activity_logs', [
            'action'     => 'created',
            'model_type' => TimetablePeriod::class,
            'model_id'   => $id,
        ]);
    }

    public function test_availability_reason_is_redacted_in_audit_log(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $teacher = $this->teacherUser($school);
        $period  = $this->periodFor($school);

        $id = $this->actingAs($admin)
            ->postJson('/api/timetable/teacher-availability', [
                'teacher_user_id'     => $teacher->id,
                'day_of_week'         => 'monday',
                'period_id'           => $period->id,
                'availability_status' => 'unavailable',
                'reason'              => 'Confidential medical appointment',
            ])
            ->json('id');

        $log = DB::table('activity_logs')
            ->where('model_type', TeacherAvailability::class)
            ->where('model_id', $id)
            ->where('action', 'created')
            ->first();

        $this->assertNotNull($log);
        $this->assertStringNotContainsString('Confidential medical appointment', (string) $log->new_values);
    }
}
