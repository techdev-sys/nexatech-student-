<?php

namespace Tests\Feature;

use App\Models\Assessment;
use App\Models\Attendance;
use App\Models\Grade;
use App\Models\GradeBoundary;
use App\Models\GradingSystem;
use App\Models\ExamSession;
use App\Models\ExamTimetable;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\TimetableRoom;
use App\Models\User;
use App\Services\AcademicResultService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ExaminationTest extends TestCase
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

    private function parentUser(School $school, Student $student): User
    {
        $user = User::factory()->asParent()->forSchool($school->id)->create();
        $student->update(['parent_user_id' => $user->id]);
        return $user;
    }

    private function classFor(School $school, string $gradeLevel = 'Form 3', ?string $section = 'A'): SchoolClass
    {
        $this->seq++;
        return SchoolClass::create([
            'school_id'   => $school->id,
            'name'        => "Class {$this->seq}",
            'grade_level' => $gradeLevel,
            'section'     => $section,
        ]);
    }

    private function studentFor(School $school, string $gradeLevel = 'Form 3', ?string $section = 'A'): Student
    {
        $this->seq++;
        return Student::create([
            'school_id'   => $school->id,
            'first_name'  => "Student{$this->seq}",
            'last_name'   => "Test",
            'grade_level' => $gradeLevel,
            'section'     => $section,
            'status'      => 'active',
        ]);
    }

    private function subjectFor(School $school, string $gradeLevel = 'Form 3'): Subject
    {
        $this->seq++;
        return Subject::create([
            'school_id'   => $school->id,
            'name'        => "Subject {$this->seq}",
            'code'        => "S{$this->seq}",
            'grade_level' => $gradeLevel,
        ]);
    }

    private function gradingSystemFor(School $school): GradingSystem
    {
        $system = GradingSystem::create([
            'school_id'  => $school->id,
            'name'       => 'Standard',
            'is_default' => true,
        ]);
        GradeBoundary::create(['grading_system_id' => $system->id, 'letter_grade' => 'A', 'label' => 'Excellent', 'min_score' => 80, 'max_score' => 100, 'is_pass' => true, 'points' => 1]);
        GradeBoundary::create(['grading_system_id' => $system->id, 'letter_grade' => 'B', 'label' => 'Good',      'min_score' => 60, 'max_score' => 79.99, 'is_pass' => true, 'points' => 2]);
        GradeBoundary::create(['grading_system_id' => $system->id, 'letter_grade' => 'C', 'label' => 'Average',   'min_score' => 50, 'max_score' => 59.99, 'is_pass' => true, 'points' => 3]);
        GradeBoundary::create(['grading_system_id' => $system->id, 'letter_grade' => 'E', 'label' => 'Fail',      'min_score' => 0,  'max_score' => 49.99, 'is_pass' => false, 'points' => 5]);
        return $system;
    }

    private function assessmentFor(School $school, Subject $subject, array $override = []): Assessment
    {
        return Assessment::create(array_merge([
            'school_id'     => $school->id,
            'subject_id'    => $subject->id,
            'name'          => 'Test',
            'type'          => 'test',
            'academic_year' => '2026',
            'term'          => 1,
            'weightage'     => 100,
            'max_marks'     => 100,
        ], $override));
    }

    private function gradeFor(School $school, Student $student, Subject $subject, Assessment $assessment, float $score): Grade
    {
        $weighted = ($score / $assessment->max_marks) * $assessment->weightage;
        return Grade::create([
            'school_id'     => $school->id,
            'student_id'    => $student->id,
            'subject_id'    => $subject->id,
            'assessment_id' => $assessment->id,
            'teacher_id'    => User::factory()->teacher()->forSchool($school->id)->create()->id,
            'term'          => $assessment->term,
            'academic_year' => $assessment->academic_year,
            'score'         => $score,
            'weighted_score'=> round($weighted, 2),
        ]);
    }

    private function examSessionFor(School $school, array $override = []): ExamSession
    {
        return ExamSession::create(array_merge([
            'school_id'     => $school->id,
            'name'          => 'End of Term',
            'academic_year' => '2026',
            'term'          => 1,
            'start_date'    => '2026-03-01',
            'end_date'      => '2026-03-10',
            'status'        => 'active',
        ], $override));
    }

    private function roomFor(School $school): TimetableRoom
    {
        $this->seq++;
        return TimetableRoom::create([
            'school_id' => $school->id,
            'name'      => "Room {$this->seq}",
            'capacity'  => 30,
            'is_active' => true,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. Teacher only sees assigned classes (school-scoped)
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_teacher_can_view_exam_sessions_in_own_school(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);
        $session = $this->examSessionFor($school);

        $this->actingAs($teacher)
            ->getJson('/api/exams/sessions')
            ->assertOk()
            ->assertJsonFragment(['id' => $session->id]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. Parent can view own child's report card
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_parent_can_view_own_child_report_card(): void
    {
        $school  = $this->school();
        $student = $this->studentFor($school);
        $parent  = $this->parentUser($school, $student);

        $this->actingAs($parent)
            ->getJson("/api/students/{$student->id}/report-card?term=1&academic_year=2026")
            ->assertOk()
            ->assertJsonPath('student.id', $student->id);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. Parent cannot view another student's report card
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_parent_cannot_view_other_student_report_card(): void
    {
        $school   = $this->school();
        $student1 = $this->studentFor($school);
        $student2 = $this->studentFor($school);
        $parent   = $this->parentUser($school, $student1);

        $this->actingAs($parent)
            ->getJson("/api/students/{$student2->id}/report-card?term=1&academic_year=2026")
            ->assertForbidden();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. Admin sees all results in their school
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_admin_can_view_any_student_report_card(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $student = $this->studentFor($school);

        $this->actingAs($admin)
            ->getJson("/api/students/{$student->id}/report-card?term=1&academic_year=2026")
            ->assertOk();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. School A cannot access School B results
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_school_a_admin_cannot_access_school_b_student_results(): void
    {
        $schoolA  = $this->school();
        $schoolB  = $this->school();
        $adminA   = $this->adminUser($schoolA);
        $studentB = $this->studentFor($schoolB);

        $this->actingAs($adminA)
            ->getJson("/api/students/{$studentB->id}/report-card?term=1&academic_year=2026")
            ->assertNotFound();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. School A cannot access School B exam sessions
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_school_a_cannot_see_school_b_exam_sessions(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $adminA  = $this->adminUser($schoolA);
        $this->examSessionFor($schoolB);

        $result = $this->actingAs($adminA)
            ->getJson('/api/exams/sessions')
            ->assertOk()
            ->json();

        $this->assertEmpty($result);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. Room conflict is blocked
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_exam_room_conflict_is_blocked(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $session = $this->examSessionFor($school);
        $class1  = $this->classFor($school, 'Form 3', 'A');
        $class2  = $this->classFor($school, 'Form 3', 'B');
        $sub1    = $this->subjectFor($school);
        $sub2    = $this->subjectFor($school);
        $room    = $this->roomFor($school);

        // First exam in the room
        $this->actingAs($admin)->postJson('/api/exams/timetable', [
            'exam_session_id' => $session->id,
            'class_id'        => $class1->id,
            'subject_id'      => $sub1->id,
            'room_id'         => $room->id,
            'exam_date'       => '2026-03-02',
            'start_time'      => '08:00',
            'end_time'        => '10:00',
        ])->assertCreated();

        // Overlapping exam same room same time
        $this->actingAs($admin)->postJson('/api/exams/timetable', [
            'exam_session_id' => $session->id,
            'class_id'        => $class2->id,
            'subject_id'      => $sub2->id,
            'room_id'         => $room->id,
            'exam_date'       => '2026-03-02',
            'start_time'      => '09:00',
            'end_time'        => '11:00',
        ])->assertUnprocessable();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. Supervisor conflict is blocked
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_exam_supervisor_conflict_is_blocked(): void
    {
        $school     = $this->school();
        $admin      = $this->adminUser($school);
        $supervisor = $this->teacherUser($school);
        $session    = $this->examSessionFor($school);
        $class1     = $this->classFor($school, 'Form 3', 'A');
        $class2     = $this->classFor($school, 'Form 3', 'B');
        $sub1       = $this->subjectFor($school);
        $sub2       = $this->subjectFor($school);

        $this->actingAs($admin)->postJson('/api/exams/timetable', [
            'exam_session_id'    => $session->id,
            'class_id'           => $class1->id,
            'subject_id'         => $sub1->id,
            'supervisor_user_id' => $supervisor->id,
            'exam_date'          => '2026-03-03',
            'start_time'         => '08:00',
            'end_time'           => '10:00',
        ])->assertCreated();

        $this->actingAs($admin)->postJson('/api/exams/timetable', [
            'exam_session_id'    => $session->id,
            'class_id'           => $class2->id,
            'subject_id'         => $sub2->id,
            'supervisor_user_id' => $supervisor->id,
            'exam_date'          => '2026-03-03',
            'start_time'         => '09:00',
            'end_time'           => '11:00',
        ])->assertUnprocessable();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 9. Class conflict is blocked
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_exam_class_conflict_is_blocked(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $session = $this->examSessionFor($school);
        $class   = $this->classFor($school);
        $sub1    = $this->subjectFor($school);
        $sub2    = $this->subjectFor($school);

        $this->actingAs($admin)->postJson('/api/exams/timetable', [
            'exam_session_id' => $session->id,
            'class_id'        => $class->id,
            'subject_id'      => $sub1->id,
            'exam_date'       => '2026-03-04',
            'start_time'      => '08:00',
            'end_time'        => '10:00',
        ])->assertCreated();

        $this->actingAs($admin)->postJson('/api/exams/timetable', [
            'exam_session_id' => $session->id,
            'class_id'        => $class->id,
            'subject_id'      => $sub2->id,
            'exam_date'       => '2026-03-04',
            'start_time'      => '09:30',
            'end_time'        => '11:30',
        ])->assertUnprocessable();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 10. Weighted mark calculated correctly
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_weighted_mark_calculated_correctly(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $student = $this->studentFor($school);
        $subject = $this->subjectFor($school);
        $this->gradingSystemFor($school);

        // Assessment worth 60% of total, max marks 100
        $assessment = $this->assessmentFor($school, $subject, ['weightage' => 60, 'max_marks' => 100]);

        // Score 80/100 → percentage 80% → weighted = 80% of 60 = 48
        $this->actingAs($admin)->postJson('/api/grades/bulk', [
            'assessment_id' => $assessment->id,
            'grades'        => [['student_id' => $student->id, 'score' => 80]],
        ])->assertStatus(201);

        $grade = Grade::where('student_id', $student->id)->first();
        $this->assertEquals(48.0, (float) $grade->weighted_score);
    }

    public function test_bulk_marks_reject_score_above_assessment_maximum(): void
    {
        $school = $this->school();
        $admin = $this->adminUser($school);
        $student = $this->studentFor($school);
        $subject = $this->subjectFor($school);
        $assessment = $this->assessmentFor($school, $subject, ['max_marks' => 50]);

        $this->actingAs($admin)->postJson('/api/grades/bulk', [
            'assessment_id' => $assessment->id,
            'grades' => [['student_id' => $student->id, 'score' => 51]],
        ])->assertUnprocessable()
          ->assertJsonValidationErrors('grades.0.score');

        $this->assertDatabaseMissing('grades', [
            'school_id' => $school->id,
            'student_id' => $student->id,
            'assessment_id' => $assessment->id,
        ]);
    }

    public function test_bulk_marks_reject_duplicate_students_in_one_request(): void
    {
        $school = $this->school();
        $admin = $this->adminUser($school);
        $student = $this->studentFor($school);
        $subject = $this->subjectFor($school);
        $assessment = $this->assessmentFor($school, $subject);

        $this->actingAs($admin)->postJson('/api/grades/bulk', [
            'assessment_id' => $assessment->id,
            'grades' => [
                ['student_id' => $student->id, 'score' => 40],
                ['student_id' => $student->id, 'score' => 45],
            ],
        ])->assertUnprocessable()
          ->assertJsonValidationErrors('grades.1.student_id');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 11. Grading boundary applied correctly
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_grading_boundary_applied_correctly(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $student = $this->studentFor($school);
        $subject = $this->subjectFor($school);
        $this->gradingSystemFor($school);

        $assessment = $this->assessmentFor($school, $subject, ['weightage' => 100, 'max_marks' => 100]);

        // Score 85 → 85% → falls in A boundary (80-100)
        $this->actingAs($admin)->postJson('/api/grades/bulk', [
            'assessment_id' => $assessment->id,
            'grades'        => [['student_id' => $student->id, 'score' => 85]],
        ])->assertStatus(201);

        $grade = Grade::where('student_id', $student->id)->first();
        $this->assertEquals('A', $grade->grade_letter);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 12. Class ranking is correct (server-side)
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_class_ranking_is_correct(): void
    {
        $school  = $this->school();
        $subject = $this->subjectFor($school, 'Form 4');

        $s1 = $this->studentFor($school, 'Form 4', 'A');
        $s2 = $this->studentFor($school, 'Form 4', 'A');
        $s3 = $this->studentFor($school, 'Form 4', 'A');

        $assessment = $this->assessmentFor($school, $subject, [
            'weightage' => 100, 'max_marks' => 100, 'term' => 1, 'academic_year' => '2026',
        ]);

        // s1=90, s2=70, s3=50
        $this->gradeFor($school, $s1, $subject, $assessment, 90);
        $this->gradeFor($school, $s2, $subject, $assessment, 70);
        $this->gradeFor($school, $s3, $subject, $assessment, 50);

        $service  = app(AcademicResultService::class);
        $rankings = $service->classRankings($school->id, 'Form 4', 'A', 1, '2026');

        $this->assertEquals(1, $rankings[$s1->id]['class_position']);
        $this->assertEquals(2, $rankings[$s2->id]['class_position']);
        $this->assertEquals(3, $rankings[$s3->id]['class_position']);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 13. Subject ranking is correct
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_subject_ranking_is_correct(): void
    {
        $school  = $this->school();
        $subject = $this->subjectFor($school, 'Form 5');

        $s1 = $this->studentFor($school, 'Form 5', 'B');
        $s2 = $this->studentFor($school, 'Form 5', 'B');

        $assessment = $this->assessmentFor($school, $subject, [
            'weightage' => 100, 'max_marks' => 100, 'term' => 1, 'academic_year' => '2026',
        ]);

        $this->gradeFor($school, $s1, $subject, $assessment, 75);
        $this->gradeFor($school, $s2, $subject, $assessment, 60);

        $service  = app(AcademicResultService::class);
        $rankings = $service->subjectRankings($school->id, $subject->id, 'Form 5', 'B', 1, '2026');

        $this->assertEquals(1, $rankings[$s1->id]['subject_position']);
        $this->assertEquals(2, $rankings[$s2->id]['subject_position']);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 14. Ties are handled correctly (DENSE_RANK)
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_ties_handled_with_dense_rank(): void
    {
        $school  = $this->school();
        $subject = $this->subjectFor($school, 'Form 6');

        $s1 = $this->studentFor($school, 'Form 6', 'A');
        $s2 = $this->studentFor($school, 'Form 6', 'A');
        $s3 = $this->studentFor($school, 'Form 6', 'A');

        $assessment = $this->assessmentFor($school, $subject, [
            'weightage' => 100, 'max_marks' => 100, 'term' => 1, 'academic_year' => '2026',
        ]);

        // s1=s2 tied at 80, s3 at 60
        $this->gradeFor($school, $s1, $subject, $assessment, 80);
        $this->gradeFor($school, $s2, $subject, $assessment, 80);
        $this->gradeFor($school, $s3, $subject, $assessment, 60);

        $service  = app(AcademicResultService::class);
        $rankings = $service->classRankings($school->id, 'Form 6', 'A', 1, '2026');

        $this->assertEquals(1, $rankings[$s1->id]['class_position']);
        $this->assertEquals(1, $rankings[$s2->id]['class_position']);
        $this->assertEquals(2, $rankings[$s3->id]['class_position']); // dense: 2, not 3
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 15. Report card contains academic data
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_report_card_contains_academic_data(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $student = $this->studentFor($school, 'Form 3', 'A');
        $subject = $this->subjectFor($school, 'Form 3');
        $this->gradingSystemFor($school);

        $assessment = $this->assessmentFor($school, $subject, [
            'weightage' => 100, 'max_marks' => 100, 'term' => 1, 'academic_year' => '2026',
        ]);
        $this->gradeFor($school, $student, $subject, $assessment, 75);

        $this->actingAs($admin)
            ->getJson("/api/students/{$student->id}/report-card?term=1&academic_year=2026")
            ->assertOk()
            ->assertJsonStructure(['student', 'subjects', 'summary', 'position'])
            ->assertJsonPath('summary.subjects_attempted', 1);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 16. Report card includes attendance section
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_report_card_includes_attendance(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $student = $this->studentFor($school);

        $this->actingAs($admin)
            ->getJson("/api/students/{$student->id}/report-card?term=1&academic_year=2026")
            ->assertOk()
            ->assertJsonStructure(['attendance' => ['present', 'absent', 'late', 'total']]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 17. Report card includes behaviour section
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_report_card_includes_behaviour(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $student = $this->studentFor($school);

        $this->actingAs($admin)
            ->getJson("/api/students/{$student->id}/report-card?term=1&academic_year=2026")
            ->assertOk()
            ->assertJsonStructure(['behaviour' => ['total_incidents', 'standing']]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 18. Report card includes finance section
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_report_card_includes_finance(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $student = $this->studentFor($school);

        $this->actingAs($admin)
            ->getJson("/api/students/{$student->id}/report-card?term=1&academic_year=2026")
            ->assertOk()
            ->assertJsonStructure(['finance' => ['outstanding', 'fee_status']]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 19. Exam sessions are auditable (audit observer fires)
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_exam_session_creation_is_audited(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        $this->actingAs($admin)->postJson('/api/exams/sessions', [
            'name'          => 'Audit Test Session',
            'academic_year' => '2026',
            'term'          => 1,
            'start_date'    => '2026-04-01',
            'end_date'      => '2026-04-05',
        ])->assertCreated();

        $this->assertDatabaseHas('activity_logs', [
            'action'     => 'created',
            'model_type' => \App\Models\ExamSession::class,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 20. Non-overlapping exams in same room are allowed
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_non_overlapping_exams_in_same_room_are_allowed(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $session = $this->examSessionFor($school);
        $class1  = $this->classFor($school, 'Form 1', 'A');
        $class2  = $this->classFor($school, 'Form 1', 'B');
        $sub1    = $this->subjectFor($school);
        $sub2    = $this->subjectFor($school);
        $room    = $this->roomFor($school);

        $this->actingAs($admin)->postJson('/api/exams/timetable', [
            'exam_session_id' => $session->id,
            'class_id'        => $class1->id,
            'subject_id'      => $sub1->id,
            'room_id'         => $room->id,
            'exam_date'       => '2026-03-05',
            'start_time'      => '08:00',
            'end_time'        => '10:00',
        ])->assertCreated();

        // Starts after the first ends — no conflict
        $this->actingAs($admin)->postJson('/api/exams/timetable', [
            'exam_session_id' => $session->id,
            'class_id'        => $class2->id,
            'subject_id'      => $sub2->id,
            'room_id'         => $room->id,
            'exam_date'       => '2026-03-05',
            'start_time'      => '10:00',
            'end_time'        => '12:00',
        ])->assertCreated();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 21. Total weightage exceeding 100% is rejected on create
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_assessment_weightage_exceeding_100_is_rejected(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $subject = $this->subjectFor($school);

        // First assessment: 80%
        $this->actingAs($admin)->postJson('/api/assessments', [
            'subject_id'    => $subject->id,
            'name'          => 'Test 1',
            'academic_year' => '2026',
            'term'          => 1,
            'weightage'     => 80,
            'max_marks'     => 100,
        ])->assertCreated();

        // Second assessment: 40% → total would be 120% — must be rejected
        $this->actingAs($admin)->postJson('/api/assessments', [
            'subject_id'    => $subject->id,
            'name'          => 'Test 2',
            'academic_year' => '2026',
            'term'          => 1,
            'weightage'     => 40,
            'max_marks'     => 100,
        ])->assertUnprocessable()
          ->assertJsonPath('errors.weightage.0', fn($msg) => str_contains($msg, '120'));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 22. Session cannot be marked completed if any subject total is not 100%
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_session_cannot_be_completed_with_incomplete_weightage(): void
    {
        $school   = $this->school();
        $admin    = $this->adminUser($school);
        $subject  = $this->subjectFor($school);
        $session  = $this->examSessionFor($school, ['status' => 'active']);

        // Only 80% of weightage assigned — not 100%
        $this->actingAs($admin)->postJson('/api/assessments', [
            'subject_id'    => $subject->id,
            'name'          => 'Test 1',
            'academic_year' => $session->academic_year,
            'term'          => $session->term,
            'weightage'     => 80,
            'max_marks'     => 100,
        ])->assertCreated();

        // Attempt to mark session as completed — must be rejected
        $this->actingAs($admin)
            ->patchJson("/api/exams/sessions/{$session->id}", ['status' => 'completed'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.status.0', fn($msg) => str_contains($msg, '80'));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 23. Exactly 100% total weightage is accepted, and session can be completed
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_exactly_100_percent_weightage_is_accepted(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $subject = $this->subjectFor($school);
        $session = $this->examSessionFor($school, ['status' => 'active']);

        // 60% + 40% = 100%
        $this->actingAs($admin)->postJson('/api/assessments', [
            'subject_id'    => $subject->id,
            'name'          => 'Coursework',
            'academic_year' => $session->academic_year,
            'term'          => $session->term,
            'weightage'     => 60,
            'max_marks'     => 100,
        ])->assertCreated();

        $this->actingAs($admin)->postJson('/api/assessments', [
            'subject_id'    => $subject->id,
            'name'          => 'Final Exam',
            'academic_year' => $session->academic_year,
            'term'          => $session->term,
            'weightage'     => 40,
            'max_marks'     => 100,
        ])->assertCreated();

        // Total is exactly 100% — session can now be completed
        $this->actingAs($admin)
            ->patchJson("/api/exams/sessions/{$session->id}", ['status' => 'completed'])
            ->assertOk()
            ->assertJsonPath('status', 'completed');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Attendance date-range helpers
    // ═══════════════════════════════════════════════════════════════════════════

    private function attendanceFor(
        School  $school,
        Student $student,
        Subject $subject,
        string  $date,
        string  $status = 'present'
    ): Attendance {
        $teacher = User::factory()->teacher()->forSchool($school->id)->create();
        return Attendance::withoutGlobalScope('tenant')->create([
            'school_id'  => $school->id,
            'student_id' => $student->id,
            'subject_id' => $subject->id,
            'teacher_id' => $teacher->id,
            'date'       => $date,
            'status'     => $status,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 24. Attendance is scoped to session dates when a session exists
    //     Records outside the session window must be excluded.
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_attendance_is_scoped_to_exam_session_dates(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $student = $this->studentFor($school);
        $subject = $this->subjectFor($school);

        // Session window: 2026-03-01 to 2026-03-10
        $this->examSessionFor($school, [
            'academic_year' => '2026',
            'term'          => 1,
            'start_date'    => '2026-03-01',
            'end_date'      => '2026-03-10',
            'status'        => 'active',
        ]);

        // 2 records inside the window
        $this->attendanceFor($school, $student, $subject, '2026-03-03', 'present');
        $this->attendanceFor($school, $student, $subject, '2026-03-07', 'absent');

        // 3 records outside the window — must NOT be counted
        $this->attendanceFor($school, $student, $subject, '2026-02-15', 'present');
        $this->attendanceFor($school, $student, $subject, '2026-03-11', 'present');
        $this->attendanceFor($school, $student, $subject, '2026-04-20', 'present');

        $response = $this->actingAs($admin)
            ->getJson("/api/students/{$student->id}/report-card?term=1&academic_year=2026")
            ->assertOk()
            ->json();

        $attendance = $response['attendance'];

        $this->assertEquals(1, $attendance['present'],     'Only 1 present within session window');
        $this->assertEquals(1, $attendance['absent'],      'Only 1 absent within session window');
        $this->assertEquals(2, $attendance['total'],       'Total must be 2, not 5');
        $this->assertEquals('2026-03-01', $attendance['period_from']);
        $this->assertEquals('2026-03-10', $attendance['period_to']);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 25. Attendance falls back to all records when no session exists
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_attendance_falls_back_to_all_records_without_session(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $student = $this->studentFor($school);
        $subject = $this->subjectFor($school);

        // No ExamSession for term=2 — fall back to all-time
        $this->attendanceFor($school, $student, $subject, '2026-01-10', 'present');
        $this->attendanceFor($school, $student, $subject, '2026-06-15', 'late');

        $response = $this->actingAs($admin)
            ->getJson("/api/students/{$student->id}/report-card?term=2&academic_year=2026")
            ->assertOk()
            ->json();

        $attendance = $response['attendance'];

        $this->assertEquals(2,    $attendance['total'],       'Both records counted with no date filter');
        $this->assertNull($attendance['period_from'],          'period_from is null when no session exists');
        $this->assertNull($attendance['period_to'],            'period_to is null when no session exists');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 26. Completed session is preferred over active for attendance scoping
    // ═══════════════════════════════════════════════════════════════════════════
    public function test_completed_session_preferred_over_active_for_attendance(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $student = $this->studentFor($school);
        $subject = $this->subjectFor($school);

        // Active session: broader window
        $this->examSessionFor($school, [
            'academic_year' => '2026',
            'term'          => 3,
            'start_date'    => '2026-09-01',
            'end_date'      => '2026-09-30',
            'status'        => 'active',
        ]);

        // Completed session: narrower, authoritative window
        $this->examSessionFor($school, [
            'name'          => 'Completed Session',
            'academic_year' => '2026',
            'term'          => 3,
            'start_date'    => '2026-09-10',
            'end_date'      => '2026-09-20',
            'status'        => 'completed',
        ]);

        // 1 record within completed window, 1 record outside it but inside active window
        $this->attendanceFor($school, $student, $subject, '2026-09-15', 'present'); // inside completed
        $this->attendanceFor($school, $student, $subject, '2026-09-05', 'absent');  // outside completed, inside active

        $response = $this->actingAs($admin)
            ->getJson("/api/students/{$student->id}/report-card?term=3&academic_year=2026")
            ->assertOk()
            ->json();

        $attendance = $response['attendance'];

        $this->assertEquals(1,              $attendance['total'],       'Only the completed-session window is used');
        $this->assertEquals('2026-09-10',   $attendance['period_from'], 'period_from matches completed session');
        $this->assertEquals('2026-09-20',   $attendance['period_to'],   'period_to matches completed session');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HARDENING — Issue 2: Parent cannot access general student endpoints
    // ═══════════════════════════════════════════════════════════════════════════

    public function test_parent_cannot_list_all_students(): void
    {
        $school  = $this->school();
        $student = $this->studentFor($school);
        $parent  = $this->parentUser($school, $student);

        $this->actingAs($parent)
            ->getJson('/api/students')
            ->assertForbidden();
    }

    public function test_parent_cannot_view_another_student(): void
    {
        $school   = $this->school();
        $student1 = $this->studentFor($school);
        $student2 = $this->studentFor($school);
        $parent   = $this->parentUser($school, $student1);

        $this->actingAs($parent)
            ->getJson("/api/students/{$student2->id}")
            ->assertForbidden();
    }

    public function test_parent_can_access_own_child_via_parent_overview(): void
    {
        $school  = $this->school();
        $student = $this->studentFor($school);
        $parent  = $this->parentUser($school, $student);

        $this->actingAs($parent)
            ->getJson('/api/v1/parent/overview')
            ->assertOk();
    }

    public function test_teacher_can_list_students(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);

        $this->actingAs($teacher)
            ->getJson('/api/students')
            ->assertOk();
    }

    public function test_admin_can_list_students(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);

        $this->actingAs($admin)
            ->getJson('/api/students')
            ->assertOk();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HARDENING — Issue 3: Pass rate uses grading boundary is_pass flag
    // ═══════════════════════════════════════════════════════════════════════════

    public function test_pass_rate_uses_grading_boundary_is_pass_flag(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $subject = $this->subjectFor($school);
        $system  = $this->gradingSystemFor($school);

        $s1 = $this->studentFor($school);
        $s2 = $this->studentFor($school);
        $assessment = $this->assessmentFor($school, $subject, [
            'weightage' => 100, 'max_marks' => 100, 'term' => 1, 'academic_year' => '2026',
        ]);

        // s1 scores 85 → letter A → is_pass=true
        $this->actingAs($admin)->postJson('/api/grades/bulk', [
            'assessment_id' => $assessment->id,
            'grades' => [['student_id' => $s1->id, 'score' => 85]],
        ])->assertStatus(201);

        // s2 scores 30 → letter E → is_pass=false
        $this->actingAs($admin)->postJson('/api/grades/bulk', [
            'assessment_id' => $assessment->id,
            'grades' => [['student_id' => $s2->id, 'score' => 30]],
        ])->assertStatus(201);

        $response = $this->actingAs($admin)
            ->getJson('/api/exams/results/dashboard?term=1&academic_year=2026')
            ->assertOk()
            ->json();

        // 1 passing (A) out of 2 graded = 50%
        $this->assertEquals(50.0, $response['pass_rate']);
    }

    public function test_pass_rate_is_null_without_grading_system(): void
    {
        $school = $this->school();
        $admin  = $this->adminUser($school);
        // No grading system created for this school

        $response = $this->actingAs($admin)
            ->getJson('/api/exams/results/dashboard?term=1&academic_year=2026')
            ->assertOk()
            ->json();

        $this->assertNull($response['pass_rate'],
            'pass_rate should be null when no default grading system exists');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HARDENING — Issue 4: Exam completion blocks timetable subjects with 0 assessments
    // ═══════════════════════════════════════════════════════════════════════════

    private function examTimetableEntryFor(
        School      $school,
        ExamSession $session,
        SchoolClass $class,
        Subject     $subject
    ): void {
        \App\Models\ExamTimetable::create([
            'school_id'       => $school->id,
            'exam_session_id' => $session->id,
            'class_id'        => $class->id,
            'subject_id'      => $subject->id,
            'exam_date'       => $session->start_date->toDateString(),
            'start_time'      => '08:00',
            'end_time'        => '10:00',
        ]);
    }

    public function test_session_completion_blocked_by_timetable_subject_with_zero_assessments(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $class   = $this->classFor($school);
        $subject = $this->subjectFor($school);
        $session = $this->examSessionFor($school, ['status' => 'active']);

        // Subject is on the timetable but has NO assessments at all
        $this->examTimetableEntryFor($school, $session, $class, $subject);

        $this->actingAs($admin)
            ->patchJson("/api/exams/sessions/{$session->id}", ['status' => 'completed'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.status.0', fn($msg) => str_contains($msg, 'no assessments'));
    }

    public function test_session_completion_blocked_by_timetable_subject_with_partial_weightage(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $class   = $this->classFor($school);
        $subject = $this->subjectFor($school);
        $session = $this->examSessionFor($school, ['status' => 'active']);

        $this->examTimetableEntryFor($school, $session, $class, $subject);

        // Assessment for the subject exists but only covers 80%
        $this->actingAs($admin)->postJson('/api/assessments', [
            'subject_id'    => $subject->id,
            'name'          => 'Test 1',
            'academic_year' => $session->academic_year,
            'term'          => $session->term,
            'weightage'     => 80,
            'max_marks'     => 100,
        ])->assertCreated();

        $this->actingAs($admin)
            ->patchJson("/api/exams/sessions/{$session->id}", ['status' => 'completed'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.status.0', fn($msg) => str_contains($msg, '80'));
    }

    public function test_session_completion_allowed_when_all_timetable_subjects_have_100_percent(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $class   = $this->classFor($school);
        $subject = $this->subjectFor($school);
        $session = $this->examSessionFor($school, ['status' => 'active']);

        $this->examTimetableEntryFor($school, $session, $class, $subject);

        // 60% + 40% = exactly 100%
        $this->actingAs($admin)->postJson('/api/assessments', [
            'subject_id'    => $subject->id,
            'name'          => 'Coursework',
            'academic_year' => $session->academic_year,
            'term'          => $session->term,
            'weightage'     => 60,
            'max_marks'     => 100,
        ])->assertCreated();

        $this->actingAs($admin)->postJson('/api/assessments', [
            'subject_id'    => $subject->id,
            'name'          => 'Final Exam',
            'academic_year' => $session->academic_year,
            'term'          => $session->term,
            'weightage'     => 40,
            'max_marks'     => 100,
        ])->assertCreated();

        $this->actingAs($admin)
            ->patchJson("/api/exams/sessions/{$session->id}", ['status' => 'completed'])
            ->assertOk()
            ->assertJsonPath('status', 'completed');
    }
}
