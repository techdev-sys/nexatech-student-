<?php

namespace Tests\Feature;

use App\Models\ParentStudent;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class TenantIsolationSecurityTest extends TestCase
{
    use DatabaseTransactions;

    public function test_admin_and_teacher_cannot_read_another_schools_students(): void
    {
        $schoolA = School::factory()->create();
        $schoolB = School::factory()->create();
        $adminA = User::factory()->admin()->forSchool($schoolA->id)->create();
        $teacherA = User::factory()->teacher()->forSchool($schoolA->id)->create();
        $studentA = Student::factory()->create(['school_id' => $schoolA->id]);
        $studentB = Student::factory()->create(['school_id' => $schoolB->id]);

        foreach ([$adminA, $teacherA] as $user) {
            $response = $this->actingAs($user)->getJson('/api/students')->assertOk();
            $ids = collect($response->json('data'))->pluck('id');
            $this->assertTrue($ids->contains($studentA->id));
            $this->assertFalse($ids->contains($studentB->id));

            $this->actingAs($user)
                ->getJson("/api/students/{$studentB->id}")
                ->assertNotFound();
        }
    }

    public function test_parent_cannot_read_another_child_or_another_schools_student(): void
    {
        $schoolA = School::factory()->create();
        $schoolB = School::factory()->create();
        $parentA = User::factory()->asParent()->forSchool($schoolA->id)->create();
        $childA = Student::factory()->create(['school_id' => $schoolA->id]);
        $unlinkedChildA = Student::factory()->create(['school_id' => $schoolA->id]);
        $studentB = Student::factory()->create(['school_id' => $schoolB->id]);

        ParentStudent::create([
            'school_id' => $schoolA->id,
            'parent_user_id' => $parentA->id,
            'student_id' => $childA->id,
            'relationship' => 'guardian',
            'is_primary_contact' => true,
            'can_receive_sms' => true,
            'can_receive_email' => true,
        ]);

        $query = '?term=1&academic_year=2026';

        $this->actingAs($parentA)
            ->getJson("/api/students/{$unlinkedChildA->id}/report-card{$query}")
            ->assertForbidden();

        $this->actingAs($parentA)
            ->getJson("/api/students/{$studentB->id}/report-card{$query}")
            ->assertNotFound();
    }
}
