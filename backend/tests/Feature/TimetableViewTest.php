<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\TimetableEntry;
use App\Models\TimetablePeriod;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class TimetableViewTest extends TestCase
{
    use DatabaseTransactions;

    private int $seq = 0;

    private function school(): School
    {
        return School::factory()->create();
    }

    private function adminUser(School $s): User   { return User::factory()->admin()->forSchool($s->id)->create(); }
    private function teacherUser(School $s): User { return User::factory()->teacher()->forSchool($s->id)->create(); }
    private function parentUser(School $s): User  { return User::factory()->asParent()->forSchool($s->id)->create(); }

    private function classFor(School $s, array $o = []): SchoolClass
    {
        $this->seq++;
        return SchoolClass::create(array_merge([
            'school_id' => $s->id, 'name' => "Class {$this->seq}", 'grade_level' => 'Grade 8', 'section' => 'A',
        ], $o));
    }

    private function subjectFor(School $s): Subject
    {
        $this->seq++;
        return Subject::create(['school_id' => $s->id, 'name' => "Subject {$this->seq}", 'code' => "S{$this->seq}"]);
    }

    private function periodFor(School $s): TimetablePeriod
    {
        return TimetablePeriod::factory()->create(['school_id' => $s->id]);
    }

    private function entry(School $s, SchoolClass $class, User $teacher, array $o = []): TimetableEntry
    {
        return TimetableEntry::create(array_merge([
            'school_id'       => $s->id,
            'class_id'        => $class->id,
            'subject_id'      => $this->subjectFor($s)->id,
            'teacher_user_id' => $teacher->id,
            'period_id'       => $this->periodFor($s)->id,
            'day_of_week'     => 'monday',
            'academic_year'   => '2026',
            'term'            => 'Term 1',
            'status'          => 'active',
        ], $o));
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    public function test_admin_dashboard_returns_aggregates_scoped_to_school(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $this->entry($schoolA, $this->classFor($schoolA), $this->teacherUser($schoolA));
        $this->entry($schoolB, $this->classFor($schoolB), $this->teacherUser($schoolB));

        $this->actingAs($this->adminUser($schoolA))
            ->getJson('/api/timetable/dashboard')
            ->assertOk()
            ->assertJsonPath('active_entries', 1)
            ->assertJsonStructure(['active_entries', 'classes_scheduled', 'teachers_scheduled', 'rooms_used', 'unavailable_teachers_today', 'by_term', 'recent_changes', 'availability_exceptions']);
    }

    public function test_parent_cannot_access_dashboard(): void
    {
        $school = $this->school();
        $this->actingAs($this->parentUser($school))
            ->getJson('/api/timetable/dashboard')
            ->assertStatus(403);
    }

    // ── Class timetable ───────────────────────────────────────────────────────

    public function test_class_timetable_returns_only_requested_class(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $teacher = $this->teacherUser($school);
        $classA  = $this->classFor($school, ['grade_level' => 'Grade 8', 'section' => 'A']);
        $classB  = $this->classFor($school, ['grade_level' => 'Grade 9', 'section' => 'B']);

        $this->entry($school, $classA, $teacher);
        $this->entry($school, $classB, $teacher, ['period_id' => $this->periodFor($school)->id]);

        $response = $this->actingAs($admin)
            ->getJson("/api/timetable/class/{$classA->id}")
            ->assertOk()
            ->assertJsonPath('class.id', $classA->id);

        $classIds = collect($response->json('entries'))->pluck('class_id')->unique()->all();
        $this->assertEquals([$classA->id], $classIds);
    }

    public function test_parent_can_view_own_childs_class_timetable(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);
        $parent  = $this->parentUser($school);
        $class   = $this->classFor($school, ['grade_level' => 'Grade 8', 'section' => 'A']);

        Student::factory()->create([
            'school_id' => $school->id, 'parent_user_id' => $parent->id,
            'grade_level' => 'Grade 8', 'section' => 'A',
        ]);
        $this->entry($school, $class, $teacher);

        $this->actingAs($parent)
            ->getJson("/api/timetable/class/{$class->id}")
            ->assertOk()
            ->assertJsonPath('class.id', $class->id);
    }

    public function test_parent_cannot_view_other_class_timetable(): void
    {
        $school  = $this->school();
        $parent  = $this->parentUser($school);
        $childClass = $this->classFor($school, ['grade_level' => 'Grade 8', 'section' => 'A']);
        $otherClass = $this->classFor($school, ['grade_level' => 'Grade 10', 'section' => 'C']);

        Student::factory()->create([
            'school_id' => $school->id, 'parent_user_id' => $parent->id,
            'grade_level' => 'Grade 8', 'section' => 'A',
        ]);

        $this->actingAs($parent)
            ->getJson("/api/timetable/class/{$otherClass->id}")
            ->assertStatus(403);
    }

    public function test_class_timetable_cross_school_404(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $classB  = $this->classFor($schoolB);

        $this->actingAs($this->adminUser($schoolA))
            ->getJson("/api/timetable/class/{$classB->id}")
            ->assertNotFound();
    }

    // ── Teacher timetable ─────────────────────────────────────────────────────

    public function test_teacher_can_view_own_timetable(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);
        $this->entry($school, $this->classFor($school), $teacher);

        $this->actingAs($teacher)
            ->getJson("/api/timetable/teacher/{$teacher->id}")
            ->assertOk()
            ->assertJsonPath('teacher.id', $teacher->id);
    }

    public function test_teacher_cannot_view_another_teachers_timetable(): void
    {
        $school   = $this->school();
        $teacherA = $this->teacherUser($school);
        $teacherB = $this->teacherUser($school);

        $this->actingAs($teacherA)
            ->getJson("/api/timetable/teacher/{$teacherB->id}")
            ->assertStatus(403);
    }

    public function test_admin_can_view_any_teacher_timetable(): void
    {
        $school  = $this->school();
        $admin   = $this->adminUser($school);
        $teacher = $this->teacherUser($school);
        $this->entry($school, $this->classFor($school), $teacher);

        $response = $this->actingAs($admin)
            ->getJson("/api/timetable/teacher/{$teacher->id}")
            ->assertOk()
            ->assertJsonPath('teacher.id', $teacher->id);

        $teacherIds = collect($response->json('entries'))->pluck('teacher_user_id')->unique()->all();
        $this->assertEquals([$teacher->id], $teacherIds);
    }

    // ── My timetable ──────────────────────────────────────────────────────────

    public function test_my_timetable_for_teacher_returns_own_entries(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);
        $other   = $this->teacherUser($school);
        $this->entry($school, $this->classFor($school), $teacher);
        $this->entry($school, $this->classFor($school), $other);

        $response = $this->actingAs($teacher)
            ->getJson('/api/timetable/my')
            ->assertOk()
            ->assertJsonPath('context', 'teacher');

        $teacherIds = collect($response->json('entries'))->pluck('teacher_user_id')->unique()->all();
        $this->assertEquals([$teacher->id], $teacherIds);
    }

    public function test_my_timetable_for_parent_returns_child_class_entries(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);
        $parent  = $this->parentUser($school);
        $class   = $this->classFor($school, ['grade_level' => 'Grade 8', 'section' => 'A']);

        Student::factory()->create([
            'school_id' => $school->id, 'parent_user_id' => $parent->id,
            'grade_level' => 'Grade 8', 'section' => 'A',
        ]);
        $this->entry($school, $class, $teacher);

        $response = $this->actingAs($parent)
            ->getJson('/api/timetable/my')
            ->assertOk()
            ->assertJsonPath('context', 'parent');

        $this->assertCount(1, $response->json('entries'));
    }

    public function test_platform_admin_cannot_access_my_timetable(): void
    {
        $platformAdmin = User::factory()->platformAdmin()->create();
        $this->actingAs($platformAdmin)
            ->getJson('/api/timetable/my')
            ->assertStatus(403);
    }

    // ── FIX 1: strict parent section matching ─────────────────────────────────

    private function linkChild(School $s, User $parent, string $grade, ?string $section): void
    {
        Student::factory()->create([
            'school_id' => $s->id, 'parent_user_id' => $parent->id,
            'grade_level' => $grade, 'section' => $section,
        ]);
    }

    public function test_parent_section_a_can_view_only_own_section_class(): void
    {
        $school = $this->school();
        $parent = $this->parentUser($school);
        $classA = $this->classFor($school, ['grade_level' => 'Grade 8', 'section' => 'A']);
        $this->linkChild($school, $parent, 'Grade 8', 'A');

        $this->actingAs($parent)
            ->getJson("/api/timetable/class/{$classA->id}")
            ->assertOk()
            ->assertJsonPath('class.id', $classA->id);
    }

    public function test_parent_section_a_cannot_view_section_b_same_grade(): void
    {
        $school = $this->school();
        $parent = $this->parentUser($school);
        $this->classFor($school, ['grade_level' => 'Grade 8', 'section' => 'A']);
        $classB = $this->classFor($school, ['grade_level' => 'Grade 8', 'section' => 'B']);
        $this->linkChild($school, $parent, 'Grade 8', 'A');

        $this->actingAs($parent)
            ->getJson("/api/timetable/class/{$classB->id}")
            ->assertStatus(403);
    }

    public function test_parent_null_section_can_view_only_null_section_class(): void
    {
        $school    = $this->school();
        $parent    = $this->parentUser($school);
        $nullClass = $this->classFor($school, ['grade_level' => 'Grade 8', 'section' => null]);
        $this->linkChild($school, $parent, 'Grade 8', null);

        $this->actingAs($parent)
            ->getJson("/api/timetable/class/{$nullClass->id}")
            ->assertOk()
            ->assertJsonPath('class.id', $nullClass->id);
    }

    public function test_parent_null_section_cannot_view_sectioned_class_same_grade(): void
    {
        $school = $this->school();
        $parent = $this->parentUser($school);
        $this->classFor($school, ['grade_level' => 'Grade 8', 'section' => null]);
        $sectioned = $this->classFor($school, ['grade_level' => 'Grade 8', 'section' => 'A']);
        $this->linkChild($school, $parent, 'Grade 8', null);

        // Null-section child must NOT wildcard-match a sectioned class in the same grade.
        $this->actingAs($parent)
            ->getJson("/api/timetable/class/{$sectioned->id}")
            ->assertStatus(403);
    }

    public function test_parent_null_section_my_timetable_excludes_sectioned_classes(): void
    {
        $school  = $this->school();
        $teacher = $this->teacherUser($school);
        $parent  = $this->parentUser($school);

        $nullClass = $this->classFor($school, ['grade_level' => 'Grade 8', 'section' => null]);
        $sectioned = $this->classFor($school, ['grade_level' => 'Grade 8', 'section' => 'A']);
        $this->linkChild($school, $parent, 'Grade 8', null);

        $this->entry($school, $nullClass, $teacher);
        $this->entry($school, $sectioned, $teacher);

        $response = $this->actingAs($parent)
            ->getJson('/api/timetable/my')
            ->assertOk()
            ->assertJsonPath('context', 'parent');

        $classIds = collect($response->json('entries'))->pluck('class_id')->unique()->all();
        $this->assertEquals([$nullClass->id], $classIds);
    }
}
