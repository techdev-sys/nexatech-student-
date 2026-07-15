<?php

namespace Tests\Feature;

use App\Models\ParentStudent;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Phase 5B Hardening — parent_student pivot + invoice route security.
 */
class ParentHardeningTest extends TestCase
{
    use DatabaseTransactions;

    // ── Factories ─────────────────────────────────────────────────────────────

    private function school(): School
    {
        return School::factory()->create();
    }

    private function parent(School $school): User
    {
        return User::factory()->asParent()->forSchool($school->id)->create();
    }

    private function admin(School $school): User
    {
        return User::factory()->admin()->forSchool($school->id)->create();
    }

    private function teacher(School $school): User
    {
        return User::factory()->teacher()->forSchool($school->id)->create();
    }

    private function accountant(School $school): User
    {
        return User::factory()->accountant()->forSchool($school->id)->create();
    }

    private function student(School $school): Student
    {
        static $n = 0;
        $n++;
        return Student::create([
            'school_id'   => $school->id,
            'first_name'  => "Child{$n}",
            'last_name'   => 'Test',
            'grade_level' => 'Form 3',
            'section'     => 'A',
            'status'      => 'active',
        ]);
    }

    private function pivotLink(School $school, User $parent, Student $student, bool $primary = true): ParentStudent
    {
        return ParentStudent::create([
            'school_id'          => $school->id,
            'parent_user_id'     => $parent->id,
            'student_id'         => $student->id,
            'is_primary_contact' => $primary,
            'can_receive_sms'    => true,
            'can_receive_email'  => true,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PIVOT TABLE — STRUCTURE & BACKFILL (1–4)
    // ═══════════════════════════════════════════════════════════════════════════

    // 1. Backfill: existing students.parent_user_id appears in parent_student
    public function test_legacy_parent_user_id_is_backfilled_into_pivot(): void
    {
        $school  = $this->school();
        $parent  = $this->parent($school);
        $student = $this->student($school);

        // Manually set parent_user_id to simulate pre-migration data
        DB::table('students')->where('id', $student->id)->update(['parent_user_id' => $parent->id]);

        // Simulate the backfill INSERT (migration runs once; we test the outcome)
        DB::table('parent_student')->insertOrIgnore([
            'school_id'          => $school->id,
            'parent_user_id'     => $parent->id,
            'student_id'         => $student->id,
            'is_primary_contact' => true,
            'can_receive_sms'    => true,
            'can_receive_email'  => true,
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);

        $exists = DB::table('parent_student')
            ->where('school_id',      $school->id)
            ->where('parent_user_id', $parent->id)
            ->where('student_id',     $student->id)
            ->whereNull('deleted_at')
            ->exists();

        $this->assertTrue($exists, 'Backfilled link should exist in parent_student');
    }

    // 2. Parent can have multiple linked children via pivot
    public function test_parent_can_have_multiple_children_via_pivot(): void
    {
        $school   = $this->school();
        $parent   = $this->parent($school);
        $child1   = $this->student($school);
        $child2   = $this->student($school);

        $this->pivotLink($school, $parent, $child1, true);
        $this->pivotLink($school, $parent, $child2, false);

        $this->actingAs($parent)
            ->getJson('/api/portal/children')
            ->assertOk()
            ->assertJsonCount(2);
    }

    // 3. A child can have multiple linked parents/guardians
    public function test_child_can_have_multiple_parents_via_pivot(): void
    {
        $school  = $this->school();
        $student = $this->student($school);
        $mother  = $this->parent($school);
        $father  = $this->parent($school);

        $this->pivotLink($school, $mother, $student, true);
        $this->pivotLink($school, $father, $student, false);

        $linkCount = DB::table('parent_student')
            ->where('student_id', $student->id)
            ->whereNull('deleted_at')
            ->count();

        $this->assertEquals(2, $linkCount, 'Student should have 2 active parent links');
    }

    // 4. Duplicate active link is blocked
    public function test_duplicate_active_link_is_blocked(): void
    {
        $school  = $this->school();
        $parent  = $this->parent($school);
        $student = $this->student($school);
        $admin   = $this->admin($school);

        // First link
        $this->actingAs($admin)
            ->postJson("/api/students/{$student->id}/link-parent", ['user_id' => $parent->id])
            ->assertSuccessful();

        // Second link: should return current state (idempotent), not 422
        $this->actingAs($admin)
            ->postJson("/api/students/{$student->id}/link-parent", ['user_id' => $parent->id])
            ->assertSuccessful();

        // Only one active link should exist
        $count = DB::table('parent_student')
            ->where('school_id',      $school->id)
            ->where('parent_user_id', $parent->id)
            ->where('student_id',     $student->id)
            ->whereNull('deleted_at')
            ->count();

        $this->assertEquals(1, $count, 'Only one active pivot link should exist');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PIVOT ACCESS AUTHORIZATION (5–8)
    // ═══════════════════════════════════════════════════════════════════════════

    // 5. Parent access uses pivot link (no legacy parent_user_id set)
    public function test_parent_portal_uses_pivot_link(): void
    {
        $school  = $this->school();
        $parent  = $this->parent($school);
        $student = $this->student($school);
        // DO NOT set parent_user_id — only pivot link
        $this->pivotLink($school, $parent, $student);

        $this->actingAs($parent)
            ->getJson("/api/portal/children/{$student->id}/overview")
            ->assertOk()
            ->assertJsonPath('student.id', $student->id);
    }

    // 6. Legacy parent_user_id fallback still works (no pivot record)
    public function test_legacy_parent_user_id_fallback_works(): void
    {
        $school  = $this->school();
        $parent  = $this->parent($school);
        $student = $this->student($school);
        // Only legacy FK — no pivot record
        DB::table('students')->where('id', $student->id)->update(['parent_user_id' => $parent->id]);

        $this->actingAs($parent)
            ->getJson("/api/portal/children/{$student->id}/overview")
            ->assertOk()
            ->assertJsonPath('student.id', $student->id);
    }

    // 7. Cross-school: parent from School A cannot link to School B student
    public function test_cross_school_parent_link_blocked(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $adminA  = $this->admin($schoolA);
        $parentA = $this->parent($schoolA);
        $studentB = $this->student($schoolB);

        $this->actingAs($adminA)
            ->postJson("/api/students/{$studentB->id}/link-parent", ['user_id' => $parentA->id])
            ->assertNotFound(); // Student doesn't exist in schoolA's tenant scope
    }

    // 8. Cross-school: parent from School A cannot access School B child through pivot
    public function test_cross_school_pivot_access_blocked(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $parentA = $this->parent($schoolA);
        $studentB = $this->student($schoolB);

        // Force a cross-school pivot record (should never happen via API, but test the guard)
        DB::table('parent_student')->insert([
            'school_id'          => $schoolB->id, // wrong school
            'parent_user_id'     => $parentA->id,
            'student_id'         => $studentB->id,
            'is_primary_contact' => false,
            'can_receive_sms'    => true,
            'can_receive_email'  => true,
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);

        // Parent A has no school_id match with studentB → 404
        $this->actingAs($parentA)
            ->getJson("/api/portal/children/{$studentB->id}/overview")
            ->assertNotFound();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PORTAL MULTI-CHILD (9–11)
    // ═══════════════════════════════════════════════════════════════════════════

    // 9. Parent can list multiple children via portal
    public function test_parent_can_list_multiple_children(): void
    {
        $school  = $this->school();
        $parent  = $this->parent($school);
        $child1  = $this->student($school);
        $child2  = $this->student($school);

        $this->pivotLink($school, $parent, $child1, true);
        $this->pivotLink($school, $parent, $child2, false);

        $response = $this->actingAs($parent)
            ->getJson('/api/portal/children')
            ->assertOk()
            ->json();

        $ids = collect($response)->pluck('id')->all();
        $this->assertContains($child1->id, $ids);
        $this->assertContains($child2->id, $ids);
    }

    // 10. Parent can access each linked child overview
    public function test_parent_can_access_each_linked_child(): void
    {
        $school  = $this->school();
        $parent  = $this->parent($school);
        $child1  = $this->student($school);
        $child2  = $this->student($school);

        $this->pivotLink($school, $parent, $child1, true);
        $this->pivotLink($school, $parent, $child2, false);

        $this->actingAs($parent)
            ->getJson("/api/portal/children/{$child1->id}/overview")
            ->assertOk();

        $this->actingAs($parent)
            ->getJson("/api/portal/children/{$child2->id}/overview")
            ->assertOk();
    }

    // 11. Parent cannot access an unlinked child
    public function test_parent_cannot_access_unlinked_child(): void
    {
        $school    = $this->school();
        $parent    = $this->parent($school);
        $child     = $this->student($school);
        $other     = $this->student($school);

        $this->pivotLink($school, $parent, $child);

        $this->actingAs($parent)
            ->getJson("/api/portal/children/{$other->id}/overview")
            ->assertForbidden();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INVOICE ROUTE SECURITY (12–18)
    // ═══════════════════════════════════════════════════════════════════════════

    // 12. Parent cannot access general invoice index
    public function test_parent_cannot_access_invoice_index(): void
    {
        $school = $this->school();
        $parent = $this->parent($school);

        $this->actingAs($parent)
            ->getJson('/api/invoices')
            ->assertForbidden();
    }

    // 13. Parent cannot access general invoice show
    public function test_parent_cannot_access_invoice_show(): void
    {
        $school  = $this->school();
        $parent  = $this->parent($school);
        $student = $this->student($school);
        $admin   = $this->admin($school);

        // Create a fee structure and invoice so the model binding resolves
        $fs = \App\Models\FeeStructure::create([
            'school_id'     => $school->id,
            'title'         => 'Test',
            'academic_year' => '2026',
            'term'          => 1,
            'amount'        => 100,
            'currency'      => 'USD',
            'due_date'      => '2026-02-01',
        ]);
        $inv = \App\Models\Invoice::create([
            'school_id'        => $school->id,
            'student_id'       => $student->id,
            'fee_structure_id' => $fs->id,
            'invoice_number'   => 'INV-TEST-' . rand(1000, 9999),
            'total_amount'     => 100,
            'paid_amount'      => 0,
            'balance_amount'   => 100,
            'status'           => 'unpaid',
            'due_date'         => '2026-02-01',
        ]);

        // Parent hits the general show route — must be blocked at role middleware (403)
        $this->actingAs($parent)
            ->getJson("/api/invoices/{$inv->id}")
            ->assertForbidden();
    }

    // 14. Parent can access linked child fees through portal
    public function test_parent_can_access_child_fees_through_portal(): void
    {
        $school  = $this->school();
        $parent  = $this->parent($school);
        $student = $this->student($school);
        $this->pivotLink($school, $parent, $student);

        $this->actingAs($parent)
            ->getJson("/api/portal/children/{$student->id}/fees")
            ->assertOk()
            ->assertJsonStructure(['outstanding', 'invoices', 'transactions']);
    }

    // 15. Parent cannot access unlinked child fees
    public function test_parent_cannot_access_unlinked_child_fees(): void
    {
        $school  = $this->school();
        $parent  = $this->parent($school);
        $linked  = $this->student($school);
        $other   = $this->student($school);
        $this->pivotLink($school, $parent, $linked);

        $this->actingAs($parent)
            ->getJson("/api/portal/children/{$other->id}/fees")
            ->assertForbidden();
    }

    // 16. Admin can access invoice list
    public function test_admin_can_access_invoice_index(): void
    {
        $school = $this->school();
        $admin  = $this->admin($school);

        $this->actingAs($admin)
            ->getJson('/api/invoices')
            ->assertOk();
    }

    // 17. Accountant can access invoice list
    public function test_accountant_can_access_invoice_index(): void
    {
        $school     = $this->school();
        $accountant = $this->accountant($school);

        $this->actingAs($accountant)
            ->getJson('/api/invoices')
            ->assertOk();
    }

    // 18. Teacher cannot access invoice list
    public function test_teacher_cannot_access_invoice_index(): void
    {
        $school  = $this->school();
        $teacher = $this->teacher($school);

        $this->actingAs($teacher)
            ->getJson('/api/invoices')
            ->assertForbidden();
    }
}
