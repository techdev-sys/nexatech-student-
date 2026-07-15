<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\BehaviourIncident;
use App\Models\BehaviourIncidentType;
use App\Models\Communication;
use App\Models\ExamSession;
use App\Models\Grade;
use App\Models\Assessment;
use App\Models\GradeBoundary;
use App\Models\GradingSystem;
use App\Models\Invoice;
use App\Models\FeeStructure;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class PortalTest extends TestCase
{
    use DatabaseTransactions;

    private int $seq = 0;

    // ── Factories ─────────────────────────────────────────────────────────────

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

    private function accountantUser(School $school): User
    {
        return User::factory()->accountant()->forSchool($school->id)->create();
    }

    private function platformAdmin(): User
    {
        return User::factory()->platformAdmin()->create();
    }

    private function parentUser(School $school, ?Student $student = null): User
    {
        $user = User::factory()->asParent()->forSchool($school->id)->create();
        if ($student) {
            $student->update(['parent_user_id' => $user->id]);
        }
        return $user;
    }

    private function student(School $school, string $gradeLevel = 'Form 3', string $section = 'A'): Student
    {
        $this->seq++;
        return Student::create([
            'school_id'   => $school->id,
            'first_name'  => "Child{$this->seq}",
            'last_name'   => 'Test',
            'grade_level' => $gradeLevel,
            'section'     => $section,
            'status'      => 'active',
        ]);
    }

    private function completedSession(School $school, int $term = 1, string $year = '2026'): ExamSession
    {
        return ExamSession::create([
            'school_id'     => $school->id,
            'name'          => "Term {$term} {$year}",
            'academic_year' => $year,
            'term'          => $term,
            'start_date'    => '2026-03-01',
            'end_date'      => '2026-03-10',
            'status'        => 'completed',
        ]);
    }

    private function draftSession(School $school, int $term = 2, string $year = '2026'): ExamSession
    {
        return ExamSession::create([
            'school_id'     => $school->id,
            'name'          => "Draft Term {$term} {$year}",
            'academic_year' => $year,
            'term'          => $term,
            'start_date'    => '2026-05-01',
            'end_date'      => '2026-05-10',
            'status'        => 'draft',
        ]);
    }

    private function subject(School $school, string $gradeLevel = 'Form 3'): Subject
    {
        $this->seq++;
        return Subject::create([
            'school_id'   => $school->id,
            'name'        => "Subject {$this->seq}",
            'code'        => "SUB{$this->seq}",
            'grade_level' => $gradeLevel,
        ]);
    }

    private function assessment(School $school, Subject $subject, int $term = 1, string $year = '2026'): Assessment
    {
        $this->seq++;
        return Assessment::create([
            'school_id'     => $school->id,
            'subject_id'    => $subject->id,
            'name'          => "Assessment {$this->seq}",
            'type'          => 'test',
            'academic_year' => $year,
            'term'          => $term,
            'weightage'     => 100,
            'max_marks'     => 100,
        ]);
    }

    private function grade(School $school, Student $student, Subject $subject, Assessment $assessment, float $score): Grade
    {
        $teacher = User::factory()->teacher()->forSchool($school->id)->create();
        return Grade::create([
            'school_id'      => $school->id,
            'student_id'     => $student->id,
            'subject_id'     => $subject->id,
            'assessment_id'  => $assessment->id,
            'teacher_id'     => $teacher->id,
            'term'           => $assessment->term,
            'academic_year'  => $assessment->academic_year,
            'score'          => $score,
            'weighted_score' => ($score / $assessment->max_marks) * $assessment->weightage,
            'grade_letter'   => $score >= 80 ? 'A' : ($score >= 60 ? 'B' : 'E'),
        ]);
    }

    private function attendanceRecord(School $school, Student $student, string $date, string $status = 'present'): Attendance
    {
        $teacher = User::factory()->teacher()->forSchool($school->id)->create();
        $subject = $this->subject($school);
        return Attendance::withoutGlobalScope('tenant')->create([
            'school_id'  => $school->id,
            'student_id' => $student->id,
            'subject_id' => $subject->id,
            'teacher_id' => $teacher->id,
            'date'       => $date,
            'status'     => $status,
        ]);
    }

    private function behaviourIncident(School $school, Student $student, int $points = -5): BehaviourIncident
    {
        $type = BehaviourIncidentType::create([
            'school_id' => $school->id,
            'name'      => 'Late to class',
            'category'  => 'negative',
            'severity'  => 'low',
            'points'    => $points,
        ]);
        $teacher = User::factory()->teacher()->forSchool($school->id)->create();
        return BehaviourIncident::create([
            'school_id'             => $school->id,
            'student_id'            => $student->id,
            'incident_type_id'      => $type->id,
            'reported_by_user_id'   => $teacher->id,
            'points'                => $points,
            'incident_date'         => '2026-03-15',
            'description'           => 'Arrived 10 minutes late.',
            'action_taken'          => 'Verbal warning given by teacher.',
            'status'                => 'recorded',
        ]);
    }

    private function invoice(School $school, Student $student): Invoice
    {
        $fs = FeeStructure::create([
            'school_id'     => $school->id,
            'title'         => 'Term 1 2026',
            'academic_year' => '2026',
            'term'          => 1,
            'amount'        => 500,
            'currency'      => 'USD',
            'due_date'      => '2026-02-01',
        ]);
        return Invoice::create([
            'school_id'       => $school->id,
            'student_id'      => $student->id,
            'fee_structure_id'=> $fs->id,
            'invoice_number'  => 'INV-2026-' . rand(1000, 9999),
            'total_amount'    => 500,
            'paid_amount'     => 0,
            'balance_amount'  => 500,
            'status'          => 'unpaid',
            'due_date'        => '2026-02-01',
        ]);
    }

    private function announcement(School $school, string $audienceType = 'all', ?array $filter = null, bool $active = true): Communication
    {
        return Communication::create([
            'school_id'             => $school->id,
            'created_by_user_id'    => User::factory()->admin()->forSchool($school->id)->create()->id,
            'channel'               => 'announcement',
            'audience_type'         => $audienceType,
            'audience_filter_json'  => $filter,
            'subject'               => "Announcement ({$audienceType})",
            'body'                  => 'Body text.',
            'published_at'          => $active ? now()->subHour() : now()->addDay(),
            'expires_at'            => $active ? now()->addDays(7) : null,
            'status'                => 'completed',
            'sent_at'               => now(),
            'total_recipients'      => 0,
            'successful_deliveries' => 0,
            'failed_deliveries'     => 0,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTHORIZATION TESTS (1–7)
    // ═══════════════════════════════════════════════════════════════════════════

    // 1. Parent cannot access general student index
    public function test_parent_cannot_access_general_student_index(): void
    {
        $school  = $this->school();
        $student = $this->student($school);
        $parent  = $this->parentUser($school, $student);

        $this->actingAs($parent)
            ->getJson('/api/students')
            ->assertForbidden();
    }

    // 2. Parent can list own linked children via portal
    public function test_parent_can_list_own_linked_children(): void
    {
        $school  = $this->school();
        $student = $this->student($school);
        $parent  = $this->parentUser($school, $student);

        $this->actingAs($parent)
            ->getJson('/api/portal/children')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $student->id);
    }

    // 3. Parent cannot access overview for an unlinked child
    public function test_parent_cannot_access_unlinked_child_overview(): void
    {
        $school   = $this->school();
        $child1   = $this->student($school);
        $child2   = $this->student($school);
        $parent   = $this->parentUser($school, $child1);

        $this->actingAs($parent)
            ->getJson("/api/portal/children/{$child2->id}/overview")
            ->assertForbidden();
    }

    // 4. Parent cannot access child from another school
    public function test_parent_cannot_access_child_from_another_school(): void
    {
        $schoolA  = $this->school();
        $schoolB  = $this->school();
        $childA   = $this->student($schoolA);
        $childB   = $this->student($schoolB);
        $parentA  = $this->parentUser($schoolA, $childA);

        $this->actingAs($parentA)
            ->getJson("/api/portal/children/{$childB->id}/overview")
            ->assertNotFound();  // school_id scoping returns 404
    }

    // 5. Teacher cannot access parent portal routes
    public function test_teacher_cannot_access_parent_portal_routes(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);

        $this->actingAs($teacher)
            ->getJson('/api/portal/children')
            ->assertForbidden();
    }

    // 6. Accountant cannot access parent portal routes
    public function test_accountant_cannot_access_parent_portal_routes(): void
    {
        $school     = $this->school();
        $accountant = $this->accountantUser($school);

        $this->actingAs($accountant)
            ->getJson('/api/portal/children')
            ->assertForbidden();
    }

    // 7. Platform admin without school_id cannot access portal data
    public function test_platform_admin_without_school_id_cannot_access_portal(): void
    {
        $this->actingAs($this->platformAdmin())
            ->getJson('/api/portal/children')
            ->assertForbidden();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ATTENDANCE (8–9)
    // ═══════════════════════════════════════════════════════════════════════════

    // 8. Parent sees own child's attendance only
    public function test_parent_sees_own_child_attendance_only(): void
    {
        $school  = $this->school();
        $student = $this->student($school);
        $parent  = $this->parentUser($school, $student);

        $this->attendanceRecord($school, $student, '2026-03-01', 'present');
        $this->attendanceRecord($school, $student, '2026-03-02', 'absent');

        $response = $this->actingAs($parent)
            ->getJson("/api/portal/children/{$student->id}/attendance")
            ->assertOk()
            ->json();

        $this->assertEquals(2, $response['summary']['total']);
        $this->assertEquals(1, $response['summary']['present']);
        $this->assertEquals(1, $response['summary']['absent']);
    }

    // 9. Parent cannot see another child's attendance
    public function test_parent_cannot_see_another_childs_attendance(): void
    {
        $school  = $this->school();
        $child1  = $this->student($school);
        $child2  = $this->student($school);
        $parent  = $this->parentUser($school, $child1);

        $this->actingAs($parent)
            ->getJson("/api/portal/children/{$child2->id}/attendance")
            ->assertForbidden();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BEHAVIOUR (10–11)
    // ═══════════════════════════════════════════════════════════════════════════

    // 10. Parent sees own child's behaviour summary
    public function test_parent_sees_own_child_behaviour_summary(): void
    {
        $school  = $this->school();
        $student = $this->student($school);
        $parent  = $this->parentUser($school, $student);

        $this->behaviourIncident($school, $student, -5);

        $response = $this->actingAs($parent)
            ->getJson("/api/portal/children/{$student->id}/behaviour")
            ->assertOk()
            ->json();

        $this->assertEquals(1, $response['summary']['incident_count']);
        $this->assertEquals(-5, $response['summary']['total_points']);
    }

    // 10a. Behaviour response does NOT expose action_taken (staff-only field)
    public function test_behaviour_response_hides_action_taken(): void
    {
        $school  = $this->school();
        $student = $this->student($school);
        $parent  = $this->parentUser($school, $student);

        $this->behaviourIncident($school, $student, -5);

        $response = $this->actingAs($parent)
            ->getJson("/api/portal/children/{$student->id}/behaviour")
            ->assertOk()
            ->json();

        // action_taken must not appear in any incident item
        foreach ($response['incidents']['data'] as $inc) {
            $this->assertArrayNotHasKey('action_taken', $inc,
                'action_taken is a staff-only field and must not be exposed to parents');
        }
    }

    // 11. Parent cannot see another child's behaviour
    public function test_parent_cannot_see_another_childs_behaviour(): void
    {
        $school  = $this->school();
        $child1  = $this->student($school);
        $child2  = $this->student($school);
        $parent  = $this->parentUser($school, $child1);

        $this->actingAs($parent)
            ->getJson("/api/portal/children/{$child2->id}/behaviour")
            ->assertForbidden();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FEES (12–13)
    // ═══════════════════════════════════════════════════════════════════════════

    // 12. Parent sees own child's invoices
    public function test_parent_sees_own_child_invoices(): void
    {
        $school  = $this->school();
        $student = $this->student($school);
        $parent  = $this->parentUser($school, $student);

        $inv = $this->invoice($school, $student);

        $response = $this->actingAs($parent)
            ->getJson("/api/portal/children/{$student->id}/fees")
            ->assertOk()
            ->json();

        $this->assertEquals(500.0, $response['outstanding']);
        $this->assertCount(1, $response['invoices']['data']);
    }

    // 13. Parent cannot see another child's fees
    public function test_parent_cannot_see_another_childs_fees(): void
    {
        $school  = $this->school();
        $child1  = $this->student($school);
        $child2  = $this->student($school);
        $parent  = $this->parentUser($school, $child1);

        $this->actingAs($parent)
            ->getJson("/api/portal/children/{$child2->id}/fees")
            ->assertForbidden();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RESULTS (14–16)
    // ═══════════════════════════════════════════════════════════════════════════

    // 14. Parent sees own child's published results
    public function test_parent_sees_own_child_published_results(): void
    {
        $school  = $this->school();
        $student = $this->student($school, 'Form 3', 'A');
        $parent  = $this->parentUser($school, $student);

        $subject    = $this->subject($school);
        $session    = $this->completedSession($school, 1, '2026');
        $assessment = $this->assessment($school, $subject, 1, '2026');
        $this->grade($school, $student, $subject, $assessment, 75);

        $response = $this->actingAs($parent)
            ->getJson("/api/portal/children/{$student->id}/results")
            ->assertOk()
            ->json();

        $this->assertCount(1, $response['results']);
        $this->assertEquals(1, $response['results'][0]['term']);
    }

    // 15. Parent cannot see another child's results
    public function test_parent_cannot_see_another_childs_results(): void
    {
        $school  = $this->school();
        $child1  = $this->student($school);
        $child2  = $this->student($school);
        $parent  = $this->parentUser($school, $child1);

        $this->actingAs($parent)
            ->getJson("/api/portal/children/{$child2->id}/results")
            ->assertForbidden();
    }

    // 16. Draft session results are NOT returned by portal results endpoint
    public function test_draft_session_results_are_hidden_from_portal(): void
    {
        $school  = $this->school();
        $student = $this->student($school, 'Form 3', 'A');
        $parent  = $this->parentUser($school, $student);

        $subject    = $this->subject($school);
        $this->draftSession($school, 2, '2026');
        $assessment = $this->assessment($school, $subject, 2, '2026');
        $this->grade($school, $student, $subject, $assessment, 80);

        $response = $this->actingAs($parent)
            ->getJson("/api/portal/children/{$student->id}/results?term=2&academic_year=2026")
            ->assertOk()
            ->json();

        $this->assertCount(0, $response['results'],
            'Grades from a draft session must not appear in portal results');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TIMETABLE (17–18)
    // ═══════════════════════════════════════════════════════════════════════════

    // 17. Parent sees own child's class timetable (endpoint responds 200)
    public function test_parent_sees_own_child_timetable(): void
    {
        $school  = $this->school();
        $student = $this->student($school, 'Form 3', 'A');
        $parent  = $this->parentUser($school, $student);

        $this->actingAs($parent)
            ->getJson("/api/portal/children/{$student->id}/timetable")
            ->assertOk()
            ->assertJsonStructure(['class', 'entries']);
    }

    // 18. Parent cannot view timetable for another child's class via portal
    public function test_parent_cannot_access_another_childs_timetable(): void
    {
        $school  = $this->school();
        $child1  = $this->student($school, 'Form 3', 'A');
        $child2  = $this->student($school, 'Form 4', 'B');
        $parent  = $this->parentUser($school, $child1);

        $this->actingAs($parent)
            ->getJson("/api/portal/children/{$child2->id}/timetable")
            ->assertForbidden();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ANNOUNCEMENTS (19–20)
    // ═══════════════════════════════════════════════════════════════════════════

    // 19. Parent sees relevant announcements (all + parents audiences)
    public function test_parent_sees_relevant_announcements(): void
    {
        $school  = $this->school();
        $student = $this->student($school);
        $parent  = $this->parentUser($school, $student);

        $allAnn     = $this->announcement($school, 'all');
        $parentAnn  = $this->announcement($school, 'parents');
        // Staff-only — must be hidden
        $staffAnn   = $this->announcement($school, 'staff');

        $response = $this->actingAs($parent)
            ->getJson('/api/portal/announcements')
            ->assertOk()
            ->json();

        $ids = collect($response['data'])->pluck('id')->all();
        $this->assertContains($allAnn->id, $ids, '"all" audience must be visible');
        $this->assertContains($parentAnn->id, $ids, '"parents" audience must be visible');
        $this->assertNotContains($staffAnn->id, $ids, '"staff" audience must be hidden from parents');
    }

    // 20. Expired and future-published announcements are hidden
    public function test_expired_and_future_announcements_are_hidden(): void
    {
        $school  = $this->school();
        $student = $this->student($school);
        $parent  = $this->parentUser($school, $student);

        // Expired (published but expires_at in past)
        Communication::create([
            'school_id'             => $school->id,
            'created_by_user_id'    => User::factory()->admin()->forSchool($school->id)->create()->id,
            'channel'               => 'announcement',
            'audience_type'         => 'all',
            'subject'               => 'Expired Notice',
            'body'                  => 'Body.',
            'published_at'          => now()->subDays(10),
            'expires_at'            => now()->subDay(),    // already expired
            'status'                => 'completed',
            'sent_at'               => now()->subDays(10),
            'total_recipients'      => 0,
            'successful_deliveries' => 0,
            'failed_deliveries'     => 0,
        ]);

        // Scheduled for future (published_at in future)
        Communication::create([
            'school_id'             => $school->id,
            'created_by_user_id'    => User::factory()->admin()->forSchool($school->id)->create()->id,
            'channel'               => 'announcement',
            'audience_type'         => 'all',
            'subject'               => 'Future Notice',
            'body'                  => 'Body.',
            'published_at'          => now()->addDays(3),  // not yet published
            'expires_at'            => null,
            'status'                => 'completed',
            'sent_at'               => now(),
            'total_recipients'      => 0,
            'successful_deliveries' => 0,
            'failed_deliveries'     => 0,
        ]);

        $response = $this->actingAs($parent)
            ->getJson('/api/portal/announcements')
            ->assertOk()
            ->json();

        $subjects = collect($response['data'])->pluck('subject')->all();
        $this->assertNotContains('Expired Notice',  $subjects, 'Expired announcements must be hidden');
        $this->assertNotContains('Future Notice',   $subjects, 'Future announcements must be hidden');
    }

    // ── Bonus: portal overview returns correct structure ───────────────────────

    public function test_portal_overview_returns_expected_structure(): void
    {
        $school  = $this->school();
        $student = $this->student($school);
        $parent  = $this->parentUser($school, $student);

        $this->actingAs($parent)
            ->getJson("/api/portal/children/{$student->id}/overview")
            ->assertOk()
            ->assertJsonStructure([
                'student'         => ['id', 'name', 'grade_level', 'status'],
                'attendance'      => ['total', 'present', 'absent', 'late', 'excused', 'percentage'],
                'fees'            => ['outstanding', 'invoice_count'],
                'behaviour'       => ['total_points', 'standing', 'incident_count'],
                'latest_results',
                'timetable_today',
                'announcements',
            ]);
    }

    // ── Bonus: report-cards list returns only completed sessions ──────────────

    public function test_report_cards_list_only_includes_completed_sessions(): void
    {
        $school  = $this->school();
        $student = $this->student($school, 'Form 3', 'A');
        $parent  = $this->parentUser($school, $student);

        $subject      = $this->subject($school);
        $completed    = $this->completedSession($school, 1, '2026');
        $draft        = $this->draftSession($school, 2, '2026');

        // Grade for both terms
        $ass1 = $this->assessment($school, $subject, 1, '2026');
        $ass2 = $this->assessment($school, $subject, 2, '2026');
        $this->grade($school, $student, $subject, $ass1, 80);
        $this->grade($school, $student, $subject, $ass2, 75);

        $response = $this->actingAs($parent)
            ->getJson("/api/portal/children/{$student->id}/report-cards")
            ->assertOk()
            ->json();

        $terms = collect($response['report_cards'])->pluck('term')->all();
        $this->assertContains(1, $terms, 'Completed session term must appear');
        $this->assertNotContains(2, $terms, 'Draft session term must not appear');
    }
}
