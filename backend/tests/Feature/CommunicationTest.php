<?php

namespace Tests\Feature;

use App\Jobs\SendCommunicationJob;
use App\Models\Communication;
use App\Models\CommunicationDelivery;
use App\Models\CommunicationTemplate;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Services\CommunicationService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class CommunicationTest extends TestCase
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

    private function templateFor(School $school, array $overrides = []): CommunicationTemplate
    {
        return CommunicationTemplate::factory()->create(array_merge(['school_id' => $school->id], $overrides));
    }

    private function commFor(School $school, User $creator, array $overrides = []): Communication
    {
        return Communication::factory()->create(array_merge([
            'school_id'          => $school->id,
            'created_by_user_id' => $creator->id,
        ], $overrides));
    }

    private function announcementFor(School $school, User $creator, array $overrides = []): Communication
    {
        return Communication::factory()->announcement()->create(array_merge([
            'school_id'          => $school->id,
            'created_by_user_id' => $creator->id,
        ], $overrides));
    }

    // ── Authorization ─────────────────────────────────────────────────────────

    public function test_parent_cannot_list_all_communications(): void
    {
        $school = $this->school();
        $parent = $this->parentUser($school);

        $this->actingAs($parent)
            ->getJson('/api/communications')
            ->assertStatus(403);
    }

    public function test_platform_admin_cannot_see_tenant_communications(): void
    {
        $platformAdmin = User::factory()->platformAdmin()->create();

        $this->actingAs($platformAdmin)
            ->getJson('/api/communications')
            ->assertStatus(403);
    }

    public function test_teacher_cannot_send_sms_communication(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);

        $this->actingAs($teacher)
            ->postJson('/api/communications', [
                'channel'       => 'sms',
                'audience_type' => 'parents',
                'body'          => 'Test',
            ])
            ->assertStatus(403);
    }

    public function test_teacher_cannot_delete_template(): void
    {
        $school   = $this->school();
        $teacher  = $this->teacherUser($school);
        $template = $this->templateFor($school);

        $this->actingAs($teacher)
            ->deleteJson("/api/communications/templates/{$template->id}")
            ->assertStatus(403);
    }

    public function test_admin_can_manage_templates(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        // Create
        $response = $this->actingAs($admin)
            ->postJson('/api/communications/templates', [
                'name'    => 'Absence Alert',
                'channel' => 'sms',
                'body'    => 'Dear {{parent_name}}, {{student_name}} was absent.',
            ])
            ->assertCreated();

        $id = $response->json('id');

        // Update
        $this->actingAs($admin)
            ->patchJson("/api/communications/templates/{$id}", ['name' => 'Updated Name'])
            ->assertOk()
            ->assertJsonPath('name', 'Updated Name');

        // Delete
        $this->actingAs($admin)
            ->deleteJson("/api/communications/templates/{$id}")
            ->assertOk();

        $this->assertSoftDeleted('communication_templates', ['id' => $id]);
    }

    public function test_teacher_can_create_announcement(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);

        $this->actingAs($teacher)
            ->postJson('/api/announcements', [
                'subject'       => 'School Event',
                'body'          => 'There will be a school event on Friday.',
                'audience_type' => 'all',
            ])
            ->assertCreated()
            ->assertJsonPath('channel', 'announcement');
    }

    public function test_teacher_cannot_delete_announcement(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);
        $ann     = $this->announcementFor($school, $teacher);

        $this->actingAs($teacher)
            ->deleteJson("/api/announcements/{$ann->id}")
            ->assertStatus(403);
    }

    public function test_admin_can_access_comms_dashboard(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        $this->actingAs($admin)
            ->getJson('/api/communications/dashboard')
            ->assertOk()
            ->assertJsonStructure([
                'sms_sent_today',
                'emails_sent_today',
                'active_announcements',
                'failed_deliveries',
                'success_rate',
                'delivery_breakdown',
                'volume_by_day',
                'recent_communications',
            ]);
    }

    public function test_teacher_cannot_access_comms_dashboard(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);

        $this->actingAs($teacher)
            ->getJson('/api/communications/dashboard')
            ->assertStatus(403);
    }

    // ── Tenant isolation ─────────────────────────────────────────────────────

    public function test_school_a_admin_cannot_see_school_b_communications(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $adminA  = $this->adminUser($schoolA);
        $adminB  = $this->adminUser($schoolB);

        $this->commFor($schoolB, $adminB);

        $response = $this->actingAs($adminA)
            ->getJson('/api/communications')
            ->assertOk();

        $this->assertEmpty($response->json('data'));
    }

    public function test_school_a_cannot_use_school_b_template(): void
    {
        $schoolA   = $this->school();
        $schoolB   = $this->school();
        $adminA    = $this->adminUser($schoolA);
        $templateB = $this->templateFor($schoolB);

        $this->actingAs($adminA)
            ->postJson('/api/communications', [
                'channel'       => 'sms',
                'audience_type' => 'parents',
                'body'          => 'Test',
                'template_id'   => $templateB->id,
            ])
            ->assertUnprocessable();
    }

    // ── Queue / Send ─────────────────────────────────────────────────────────

    public function test_send_queues_job_and_creates_delivery_rows(): void
    {
        Queue::fake();

        $school = $this->school();
        $admin  = $this->adminUser($school);
        $parent = $this->parentUser($school);

        $comm = $this->commFor($school, $admin, ['audience_type' => 'parents']);

        $this->actingAs($admin)
            ->postJson("/api/communications/{$comm->id}/send")
            ->assertOk();

        Queue::assertPushed(SendCommunicationJob::class, fn($job) => $job->communication->id === $comm->id);

        $this->assertDatabaseHas('communication_deliveries', [
            'communication_id' => $comm->id,
            'delivery_status'  => 'pending',
        ]);
    }

    public function test_duplicate_send_is_prevented(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);
        $comm   = $this->commFor($school, $admin, ['status' => 'completed']);

        $this->actingAs($admin)
            ->postJson("/api/communications/{$comm->id}/send")
            ->assertUnprocessable();
    }

    public function test_communication_cancel_works(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);
        $comm   = $this->commFor($school, $admin, ['status' => 'draft']);

        $this->actingAs($admin)
            ->postJson("/api/communications/{$comm->id}/cancel")
            ->assertOk();

        $this->assertDatabaseHas('communications', ['id' => $comm->id, 'status' => 'cancelled']);
    }

    public function test_template_restore_works(): void
    {
        $school   = $this->school();
        $admin    = $this->adminUser($school);
        $template = $this->templateFor($school);
        $template->delete();

        $this->actingAs($admin)
            ->postJson("/api/communications/templates/{$template->id}/restore")
            ->assertOk();

        $this->assertDatabaseHas('communication_templates', ['id' => $template->id, 'deleted_at' => null]);
    }

    // ── Parent visibility ────────────────────────────────────────────────────

    public function test_parent_sees_only_allowed_announcements(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);
        $parent = $this->parentUser($school);

        // Parent-visible
        $ann1 = $this->announcementFor($school, $admin, ['audience_type' => 'all']);
        $ann2 = $this->announcementFor($school, $admin, ['audience_type' => 'parents']);

        // Staff-only — parent must NOT see these
        $ann3 = $this->announcementFor($school, $admin, ['audience_type' => 'teachers']);
        $ann4 = $this->announcementFor($school, $admin, ['audience_type' => 'staff']);

        $response = $this->actingAs($parent)
            ->getJson('/api/announcements')
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($ann1->id, $ids);
        $this->assertContains($ann2->id, $ids);
        $this->assertNotContains($ann3->id, $ids);
        $this->assertNotContains($ann4->id, $ids);
    }

    public function test_parent_cannot_view_staff_only_announcement_by_id(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);
        $parent = $this->parentUser($school);

        $staffAnn = $this->announcementFor($school, $admin, ['audience_type' => 'staff']);

        $this->actingAs($parent)
            ->getJson("/api/announcements/{$staffAnn->id}")
            ->assertStatus(403);
    }

    // ── Dashboard isolation ──────────────────────────────────────────────────

    public function test_dashboard_metrics_only_include_current_school(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $adminA  = $this->adminUser($schoolA);
        $adminB  = $this->adminUser($schoolB);

        // School B has sent communications
        $this->commFor($schoolB, $adminB, ['status' => 'completed', 'sent_at' => now(), 'successful_deliveries' => 10]);

        // School A dashboard should show 0 (no communications)
        $response = $this->actingAs($adminA)
            ->getJson('/api/communications/dashboard')
            ->assertOk();

        $this->assertEquals(0, $response->json('sms_sent_today'));
        $this->assertEquals(0, $response->json('emails_sent_today'));
        $this->assertEmpty($response->json('recent_communications'));
    }

    // ── Query validation ─────────────────────────────────────────────────────

    public function test_invalid_filter_returns_validation_error(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        $this->actingAs($admin)
            ->getJson('/api/communications?status=invalid_status')
            ->assertUnprocessable();

        $this->actingAs($admin)
            ->getJson('/api/communications?from_date=2026-06-01&to_date=2026-01-01')
            ->assertUnprocessable();
    }

    public function test_delivery_logs_are_paginated_and_scoped(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);
        $comm   = $this->commFor($school, $admin);

        CommunicationDelivery::factory()->count(3)->create([
            'school_id'        => $school->id,
            'communication_id' => $comm->id,
        ]);

        $response = $this->actingAs($admin)
            ->getJson("/api/communications/{$comm->id}/deliveries?per_page=2")
            ->assertOk();

        $this->assertCount(2, $response->json('data'));
        $this->assertEquals(3, $response->json('total'));
    }

    // ── Fix 1: classParents() ─────────────────────────────────────────────────

    public function test_class_audience_targets_students_in_matching_grade_and_section(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        $class = SchoolClass::create([
            'school_id'   => $school->id,
            'name'        => 'Grade 8A',
            'grade_level' => 'Grade 8',
            'section'     => 'A',
        ]);

        $parent1 = $this->parentUser($school);
        $parent2 = $this->parentUser($school);
        $parent3 = $this->parentUser($school);

        // In class — Grade 8, Section A
        Student::factory()->create([
            'school_id'      => $school->id,
            'grade_level'    => 'Grade 8',
            'section'        => 'A',
            'parent_user_id' => $parent1->id,
            'parent_email'   => $parent1->email,
        ]);

        // Same grade, different section — NOT in class
        Student::factory()->create([
            'school_id'      => $school->id,
            'grade_level'    => 'Grade 8',
            'section'        => 'B',
            'parent_user_id' => $parent2->id,
            'parent_email'   => $parent2->email,
        ]);

        // Different grade entirely — NOT in class
        Student::factory()->create([
            'school_id'      => $school->id,
            'grade_level'    => 'Grade 9',
            'section'        => 'A',
            'parent_user_id' => $parent3->id,
            'parent_email'   => $parent3->email,
        ]);

        $comm = $this->commFor($school, $admin, [
            'audience_type'        => 'class',
            'audience_filter_json' => ['class_id' => $class->id],
        ]);

        $service  = app(CommunicationService::class);
        $audience = $service->resolveAudience($comm);
        $userIds  = $audience->pluck('user_id')->all();

        $this->assertContains($parent1->id, $userIds);
        $this->assertNotContains($parent2->id, $userIds);
        $this->assertNotContains($parent3->id, $userIds);
    }

    public function test_class_without_section_matches_all_students_in_grade(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        // Class with no section — targets all students in that grade_level
        $class = SchoolClass::create([
            'school_id'   => $school->id,
            'name'        => 'Grade 7 All',
            'grade_level' => 'Grade 7',
            'section'     => null,
        ]);

        $parentA = $this->parentUser($school);
        $parentB = $this->parentUser($school);

        Student::factory()->create([
            'school_id'      => $school->id,
            'grade_level'    => 'Grade 7',
            'section'        => 'A',
            'parent_user_id' => $parentA->id,
            'parent_email'   => $parentA->email,
        ]);
        Student::factory()->create([
            'school_id'      => $school->id,
            'grade_level'    => 'Grade 7',
            'section'        => 'B',
            'parent_user_id' => $parentB->id,
            'parent_email'   => $parentB->email,
        ]);

        $comm    = $this->commFor($school, $admin, [
            'audience_type'        => 'class',
            'audience_filter_json' => ['class_id' => $class->id],
        ]);
        $service  = app(CommunicationService::class);
        $audience = $service->resolveAudience($comm);
        $userIds  = $audience->pluck('user_id')->all();

        $this->assertContains($parentA->id, $userIds);
        $this->assertContains($parentB->id, $userIds);
    }

    public function test_class_from_another_school_returns_empty_audience(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $adminA  = $this->adminUser($schoolA);

        $classB = SchoolClass::create([
            'school_id'   => $schoolB->id,
            'name'        => 'Grade 8A',
            'grade_level' => 'Grade 8',
            'section'     => 'A',
        ]);

        $comm = $this->commFor($schoolA, $adminA, [
            'audience_type'        => 'class',
            'audience_filter_json' => ['class_id' => $classB->id],
        ]);

        $service  = app(CommunicationService::class);
        $audience = $service->resolveAudience($comm);

        $this->assertEmpty($audience);
    }

    public function test_invalid_class_id_returns_empty_audience(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        $comm = $this->commFor($school, $admin, [
            'audience_type'        => 'class',
            'audience_filter_json' => ['class_id' => 999999],
        ]);

        $service  = app(CommunicationService::class);
        $audience = $service->resolveAudience($comm);

        $this->assertEmpty($audience);
    }

    // ── Fix 2: Announcement expiry ────────────────────────────────────────────

    public function test_active_only_filter_excludes_expired_announcements(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        $active  = $this->announcementFor($school, $admin, [
            'published_at' => now()->subDay(),
            'expires_at'   => now()->addDay(),
        ]);
        $expired = $this->announcementFor($school, $admin, [
            'published_at' => now()->subDays(5),
            'expires_at'   => now()->subHour(),
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/announcements?active_only=1')
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($active->id, $ids);
        $this->assertNotContains($expired->id, $ids);
    }

    public function test_active_only_filter_excludes_future_announcements(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        $future = $this->announcementFor($school, $admin, [
            'published_at' => now()->addDay(),
        ]);
        $current = $this->announcementFor($school, $admin, [
            'published_at' => now()->subHour(),
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/announcements?active_only=1')
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($current->id, $ids);
        $this->assertNotContains($future->id, $ids);
    }

    public function test_active_only_filter_includes_no_expiry_announcements(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        // published_at in past, no expires_at → always active
        $permanent = $this->announcementFor($school, $admin, [
            'published_at' => now()->subDays(10),
            'expires_at'   => null,
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/announcements?active_only=1')
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($permanent->id, $ids);
    }

    public function test_without_active_only_filter_returns_all_including_expired(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);

        $expired = $this->announcementFor($school, $admin, [
            'published_at' => now()->subDays(5),
            'expires_at'   => now()->subDay(),
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/announcements')
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($expired->id, $ids);
    }

    public function test_announcement_store_accepts_published_and_expires_at(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        $published = now()->addHour()->toIso8601String();
        $expires   = now()->addDays(7)->toIso8601String();

        $this->actingAs($admin)
            ->postJson('/api/announcements', [
                'subject'       => 'Future Notice',
                'body'          => 'This will be published later.',
                'audience_type' => 'all',
                'published_at'  => $published,
                'expires_at'    => $expires,
            ])
            ->assertCreated()
            ->assertJsonStructure(['published_at', 'expires_at']);
    }

    // ── Fix 1 extra: class_id required for class audience ─────────────────────

    public function test_class_audience_without_class_id_returns_empty(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        // audience_type='class' but no class_id in filter — must not fall back to grade_level
        Student::factory()->create([
            'school_id'   => $school->id,
            'grade_level' => 'Grade 8',
            'section'     => 'A',
        ]);

        $comm = $this->commFor($school, $admin, [
            'audience_type'        => 'class',
            'audience_filter_json' => [], // deliberately empty — no class_id
        ]);

        $service  = app(CommunicationService::class);
        $audience = $service->resolveAudience($comm);

        $this->assertEmpty($audience);
    }

    // ── Fix 2: Parent class/grade announcement visibility ─────────────────────

    public function test_parent_sees_class_announcement_for_own_childs_class(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);
        $parent = $this->parentUser($school);

        $class = SchoolClass::create([
            'school_id'   => $school->id,
            'name'        => 'Grade 8A',
            'grade_level' => 'Grade 8',
            'section'     => 'A',
        ]);

        Student::factory()->create([
            'school_id'      => $school->id,
            'grade_level'    => 'Grade 8',
            'section'        => 'A',
            'parent_user_id' => $parent->id,
        ]);

        $ann = $this->announcementFor($school, $admin, [
            'audience_type'        => 'class',
            'audience_filter_json' => ['class_id' => $class->id],
        ]);

        $response = $this->actingAs($parent)
            ->getJson('/api/announcements')
            ->assertOk();

        $this->assertContains($ann->id, collect($response->json('data'))->pluck('id')->all());
    }

    public function test_parent_cannot_see_announcement_for_another_class(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);
        $parent = $this->parentUser($school);

        $classA = SchoolClass::create(['school_id' => $school->id, 'name' => 'Grade 8A', 'grade_level' => 'Grade 8', 'section' => 'A']);
        $classB = SchoolClass::create(['school_id' => $school->id, 'name' => 'Grade 8B', 'grade_level' => 'Grade 8', 'section' => 'B']);

        // Parent's child is in class A
        Student::factory()->create([
            'school_id'      => $school->id,
            'grade_level'    => 'Grade 8',
            'section'        => 'A',
            'parent_user_id' => $parent->id,
        ]);

        // Announcement for class B only
        $annB = $this->announcementFor($school, $admin, [
            'audience_type'        => 'class',
            'audience_filter_json' => ['class_id' => $classB->id],
        ]);

        $response = $this->actingAs($parent)
            ->getJson('/api/announcements')
            ->assertOk();

        $this->assertNotContains($annB->id, collect($response->json('data'))->pluck('id')->all());
    }

    public function test_parent_cannot_fetch_class_announcement_by_id_for_wrong_class(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);
        $parent = $this->parentUser($school);

        $classA = SchoolClass::create(['school_id' => $school->id, 'name' => 'Grade 8A', 'grade_level' => 'Grade 8', 'section' => 'A']);
        $classB = SchoolClass::create(['school_id' => $school->id, 'name' => 'Grade 9A', 'grade_level' => 'Grade 9', 'section' => 'A']);

        Student::factory()->create([
            'school_id'      => $school->id,
            'grade_level'    => 'Grade 8',
            'section'        => 'A',
            'parent_user_id' => $parent->id,
        ]);

        $annB = $this->announcementFor($school, $admin, [
            'audience_type'        => 'class',
            'audience_filter_json' => ['class_id' => $classB->id],
        ]);

        $this->actingAs($parent)
            ->getJson("/api/announcements/{$annB->id}")
            ->assertStatus(403);
    }

    public function test_parent_sees_grade_announcement_for_own_childs_grade(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);
        $parent = $this->parentUser($school);

        Student::factory()->create([
            'school_id'      => $school->id,
            'grade_level'    => 'Grade 8',
            'parent_user_id' => $parent->id,
        ]);

        $ann = $this->announcementFor($school, $admin, [
            'audience_type'        => 'grade',
            'audience_filter_json' => ['grade_level' => 'Grade 8'],
        ]);

        $response = $this->actingAs($parent)
            ->getJson('/api/announcements')
            ->assertOk();

        $this->assertContains($ann->id, collect($response->json('data'))->pluck('id')->all());
    }

    public function test_parent_cannot_see_grade_announcement_for_different_grade(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);
        $parent = $this->parentUser($school);

        Student::factory()->create([
            'school_id'      => $school->id,
            'grade_level'    => 'Grade 8',
            'parent_user_id' => $parent->id,
        ]);

        $grade9Ann = $this->announcementFor($school, $admin, [
            'audience_type'        => 'grade',
            'audience_filter_json' => ['grade_level' => 'Grade 9'],
        ]);

        $response = $this->actingAs($parent)
            ->getJson('/api/announcements')
            ->assertOk();

        $this->assertNotContains($grade9Ann->id, collect($response->json('data'))->pluck('id')->all());
    }

    // ── Fix 3: Atomic send idempotency ────────────────────────────────────────

    public function test_atomic_send_prevents_duplicate_dispatch(): void
    {
        Queue::fake();

        $school = $this->school();
        $admin  = $this->adminUser($school);
        $this->parentUser($school); // create a parent so audience is non-empty

        $comm = $this->commFor($school, $admin, ['audience_type' => 'parents']);

        // First send succeeds
        $this->actingAs($admin)
            ->postJson("/api/communications/{$comm->id}/send")
            ->assertOk();

        // Second send on the now-queued communication must fail
        $this->actingAs($admin)
            ->postJson("/api/communications/{$comm->id}/send")
            ->assertUnprocessable();

        Queue::assertPushed(SendCommunicationJob::class, 1);
    }

    // ── Fix 5: Dashboard active announcements with expiry ─────────────────────

    public function test_dashboard_active_announcements_excludes_expired_and_future(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        // Expired
        $this->announcementFor($school, $admin, [
            'published_at' => now()->subDays(5),
            'expires_at'   => now()->subHour(),
        ]);
        // Future (not published yet)
        $this->announcementFor($school, $admin, [
            'published_at' => now()->addHour(),
        ]);
        // Active
        $this->announcementFor($school, $admin, [
            'published_at' => now()->subDay(),
            'expires_at'   => now()->addDay(),
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/communications/dashboard')
            ->assertOk();

        $this->assertEquals(1, $response->json('active_announcements'));
    }
}
