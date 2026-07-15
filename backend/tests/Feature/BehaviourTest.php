<?php

namespace Tests\Feature;

use App\Jobs\SendBehaviourIncidentNotificationJob;
use App\Models\BehaviourIncident;
use App\Models\BehaviourIncidentType;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class BehaviourTest extends TestCase
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

    private function studentFor(School $school, ?User $linkedParent = null): Student
    {
        return Student::factory()->create([
            'school_id'      => $school->id,
            'parent_user_id' => $linkedParent?->id,
        ]);
    }

    private function typeFor(School $school, array $overrides = []): BehaviourIncidentType
    {
        return BehaviourIncidentType::factory()->create(array_merge(['school_id' => $school->id], $overrides));
    }

    private function incidentFor(School $school, Student $student, BehaviourIncidentType $type, User $reporter, array $overrides = []): BehaviourIncident
    {
        return BehaviourIncident::factory()->create(array_merge([
            'school_id'           => $school->id,
            'student_id'          => $student->id,
            'incident_type_id'    => $type->id,
            'reported_by_user_id' => $reporter->id,
        ], $overrides));
    }

    // ── FIX 1 + 2: Authorization & Tenant Isolation ───────────────────────────

    public function test_platform_admin_cannot_list_behaviour_incidents(): void
    {
        $platformAdmin = User::factory()->platformAdmin()->create();

        $this->actingAs($platformAdmin)
            ->getJson('/api/behaviour/incidents')
            ->assertStatus(403);
    }

    public function test_parent_cannot_list_all_behaviour_incidents(): void
    {
        $school = $this->school();
        $parent = $this->parentUser($school);

        $this->actingAs($parent)
            ->getJson('/api/behaviour/incidents')
            ->assertStatus(403);
    }

    public function test_teacher_cannot_manage_incident_types(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);

        $this->actingAs($teacher)
            ->postJson('/api/behaviour/incident-types', [
                'name'           => 'Fighting',
                'default_points' => -10,
                'severity'       => 'high',
                'category'       => 'negative',
            ])
            ->assertStatus(403);
    }

    public function test_admin_can_manage_incident_types(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        $this->actingAs($admin)
            ->postJson('/api/behaviour/incident-types', [
                'name'           => 'Merit Award',
                'default_points' => 10,
                'severity'       => 'low',
                'category'       => 'positive',
                'notify_parent'  => false,
            ])
            ->assertCreated()
            ->assertJsonPath('category', 'positive');
    }

    public function test_teacher_can_record_incident(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);
        $student = $this->studentFor($school);
        $type    = $this->typeFor($school);

        $this->actingAs($teacher)
            ->postJson('/api/behaviour/incidents', [
                'student_id'       => $student->id,
                'incident_type_id' => $type->id,
                'points'           => -5,
                'incident_date'    => now()->format('Y-m-d'),
            ])
            ->assertCreated()
            ->assertJsonPath('incident.student_id', $student->id);
    }

    // ── FIX 3: Parent / Own-Child Access ──────────────────────────────────────

    public function test_parent_can_view_own_child_behaviour_summary(): void
    {
        $school  = $this->school();
        $parent  = $this->parentUser($school);
        $student = $this->studentFor($school, $parent);

        $this->actingAs($parent)
            ->getJson("/api/students/{$student->id}/behaviour-summary")
            ->assertOk()
            ->assertJsonStructure(['total_points', 'standing']);
    }

    public function test_parent_cannot_view_another_childs_behaviour(): void
    {
        $school       = $this->school();
        $parent       = $this->parentUser($school);
        $otherStudent = $this->studentFor($school); // not linked to parent

        $this->actingAs($parent)
            ->getJson("/api/students/{$otherStudent->id}/behaviour-summary")
            ->assertStatus(403);
    }

    // ── FIX 4: Notification queued, not inline ────────────────────────────────

    public function test_incident_with_notify_parent_queues_sms_job(): void
    {
        Queue::fake();

        $school  = $this->school();
        $teacher = $this->teacherUser($school);
        $student = $this->studentFor($school);
        $type    = $this->typeFor($school, ['notify_parent' => true, 'severity' => 'high']);

        $this->actingAs($teacher)
            ->postJson('/api/behaviour/incidents', [
                'student_id'       => $student->id,
                'incident_type_id' => $type->id,
                'points'           => -10,
                'incident_date'    => now()->format('Y-m-d'),
            ])
            ->assertCreated()
            ->assertJsonPath('notification_queued', true);

        Queue::assertPushed(SendBehaviourIncidentNotificationJob::class);
    }

    public function test_duplicate_notification_is_not_sent(): void
    {
        Queue::fake();

        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $student = $this->studentFor($school);
        $type    = $this->typeFor($school, ['notify_parent' => true, 'severity' => 'high']);

        // Incident already has parent_notified_at set
        $incident = $this->incidentFor($school, $student, $type, $admin, [
            'parent_notified_at' => now(),
        ]);
        $incident->load('incidentType');

        $service = app(\App\Services\BehaviourNotificationService::class);
        $queued  = $service->dispatchIfRequired($incident);

        $this->assertFalse($queued);
        Queue::assertNotPushed(SendBehaviourIncidentNotificationJob::class);
    }

    // ── Tenancy isolation ─────────────────────────────────────────────────────

    public function test_school_a_admin_cannot_see_school_b_incidents(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();

        $adminA   = $this->adminUser($schoolA);
        $adminB   = $this->adminUser($schoolB);
        $studentB = $this->studentFor($schoolB);
        $typeB    = $this->typeFor($schoolB);

        $this->incidentFor($schoolB, $studentB, $typeB, $adminB);

        $response = $this->actingAs($adminA)
            ->getJson('/api/behaviour/incidents')
            ->assertOk();

        $this->assertEmpty($response->json('data'));
    }

    public function test_school_a_teacher_cannot_create_incident_for_school_b_student(): void
    {
        $schoolA  = $this->school();
        $schoolB  = $this->school();
        $teacherA = $this->teacherUser($schoolA);
        $studentB = $this->studentFor($schoolB);
        $typeA    = $this->typeFor($schoolA);

        // student_id is from school B; validation rejects it because the exists check scopes to school A
        $this->actingAs($teacherA)
            ->postJson('/api/behaviour/incidents', [
                'student_id'       => $studentB->id,
                'incident_type_id' => $typeA->id,
                'points'           => -5,
                'incident_date'    => now()->format('Y-m-d'),
            ])
            ->assertUnprocessable();
    }

    // ── Soft delete / restore ─────────────────────────────────────────────────

    public function test_incident_soft_delete_works(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $student = $this->studentFor($school);
        $type    = $this->typeFor($school);
        $inc     = $this->incidentFor($school, $student, $type, $admin);

        $this->actingAs($admin)
            ->deleteJson("/api/behaviour/incidents/{$inc->id}")
            ->assertOk();

        $this->assertSoftDeleted('behaviour_incidents', ['id' => $inc->id]);
    }

    public function test_incident_restore_works(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $student = $this->studentFor($school);
        $type    = $this->typeFor($school);
        $inc     = $this->incidentFor($school, $student, $type, $admin);
        $inc->delete();

        $this->actingAs($admin)
            ->postJson("/api/behaviour/incidents/{$inc->id}/restore")
            ->assertOk();

        $this->assertDatabaseHas('behaviour_incidents', ['id' => $inc->id, 'deleted_at' => null]);
    }

    // ── Reports ───────────────────────────────────────────────────────────────

    public function test_parent_cannot_access_class_report(): void
    {
        $school = $this->school();
        $parent = $this->parentUser($school);

        $this->actingAs($parent)
            ->getJson('/api/behaviour/reports/class')
            ->assertStatus(403);
    }

    public function test_class_report_only_includes_current_school_records(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $adminA  = $this->adminUser($schoolA);
        $adminB  = $this->adminUser($schoolB);

        $studentA = $this->studentFor($schoolA);
        $studentB = $this->studentFor($schoolB);
        $typeA    = $this->typeFor($schoolA);
        $typeB    = $this->typeFor($schoolB);

        $this->incidentFor($schoolA, $studentA, $typeA, $adminA);
        $this->incidentFor($schoolB, $studentB, $typeB, $adminB);

        $response = $this->actingAs($adminA)
            ->getJson('/api/behaviour/reports/class')
            ->assertOk();

        $studentIds = collect($response->json('data'))->pluck('student.id');
        $this->assertContains($studentA->id, $studentIds->all());
        $this->assertNotContains($studentB->id, $studentIds->all());
    }

    // ── FIX 8: Query validation ───────────────────────────────────────────────

    public function test_invalid_date_range_returns_validation_error(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        $this->actingAs($admin)
            ->getJson('/api/behaviour/incidents?from_date=2026-06-01&to_date=2026-01-01')
            ->assertUnprocessable();
    }

    public function test_invalid_status_filter_returns_validation_error(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        $this->actingAs($admin)
            ->getJson('/api/behaviour/incidents?status=invalid_status')
            ->assertUnprocessable();
    }
}
