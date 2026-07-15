<?php

namespace Tests\Feature;

use App\Models\CashbookEntry;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\FeeStructure;
use App\Models\IncomeCategory;
use App\Models\Invoice;
use App\Models\School;
use App\Models\Student;
use App\Models\Transaction;
use App\Models\User;
use App\Services\CashbookService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AccountingFoundationTest extends TestCase
{
    use DatabaseTransactions;

    private int $seq = 0;

    private function school(): School { return School::factory()->create(); }
    private function admin(School $s): User      { return User::factory()->admin()->forSchool($s->id)->create(); }
    private function accountant(School $s): User  { return User::factory()->accountant()->forSchool($s->id)->create(); }
    private function teacher(School $s): User     { return User::factory()->teacher()->forSchool($s->id)->create(); }
    private function parentU(School $s): User     { return User::factory()->asParent()->forSchool($s->id)->create(); }

    private function expCat(School $s, array $o = []): ExpenseCategory
    {
        $this->seq++;
        return ExpenseCategory::create(array_merge(['school_id' => $s->id, 'name' => "ExpCat {$this->seq}", 'is_active' => true], $o));
    }

    private function expense(School $s, User $by, array $o = []): Expense
    {
        return Expense::create(array_merge([
            'school_id'           => $s->id,
            'expense_category_id' => $this->expCat($s)->id,
            'expense_date'        => now()->toDateString(),
            'amount'              => 100.00,
            'status'              => 'draft',
            'created_by_user_id'  => $by->id,
        ], $o));
    }

    /** Build a successful transaction with its full invoice chain. */
    private function successfulTransaction(School $s, float $amount = 250.00): Transaction
    {
        $this->seq++;
        $student = Student::factory()->create(['school_id' => $s->id]);
        $fee = FeeStructure::create([
            'school_id' => $s->id, 'title' => "Fee {$this->seq}", 'academic_year' => '2026',
            'term' => 1, 'amount' => $amount, 'currency' => 'USD',
        ]);
        $invoice = Invoice::create([
            'school_id' => $s->id, 'student_id' => $student->id, 'fee_structure_id' => $fee->id,
            'invoice_number' => "INV-{$this->seq}-" . fake()->unique()->numberBetween(1, 999999),
            'total_amount' => $amount, 'paid_amount' => $amount, 'balance_amount' => 0,
            'status' => 'paid', 'due_date' => now()->toDateString(),
        ]);
        return Transaction::create([
            'school_id' => $s->id, 'invoice_id' => $invoice->id,
            'transaction_reference' => "TXN-{$this->seq}-" . fake()->unique()->numberBetween(1, 999999),
            'gateway' => 'manual', 'amount' => $amount, 'currency' => 'USD',
            'status' => 'successful', 'settled_at' => now(),
        ]);
    }

    // ── Authorization ─────────────────────────────────────────────────────────

    public function test_accountant_can_access_finance_dashboard(): void
    {
        $s = $this->school();
        $this->actingAs($this->accountant($s))->getJson('/api/finance/dashboard')
            ->assertOk()
            ->assertJsonStructure(['income_today', 'income_this_month', 'expenses_this_month', 'outstanding_invoices', 'net_cash_position']);
    }

    public function test_admin_can_manage_expense_categories(): void
    {
        $s = $this->school();
        $this->actingAs($this->admin($s))
            ->postJson('/api/finance/expense-categories', ['name' => 'Salaries', 'code' => 'SAL'])
            ->assertCreated()->assertJsonPath('name', 'Salaries');
    }

    public function test_teacher_cannot_access_finance(): void
    {
        $s = $this->school();
        $this->actingAs($this->teacher($s))->getJson('/api/finance/dashboard')->assertStatus(403);
        $this->actingAs($this->teacher($s))->getJson('/api/finance/expenses')->assertStatus(403);
    }

    public function test_parent_cannot_access_finance(): void
    {
        $s = $this->school();
        $this->actingAs($this->parentU($s))->getJson('/api/finance/cashbook')->assertStatus(403);
    }

    public function test_platform_admin_without_school_cannot_see_finance(): void
    {
        $this->actingAs(User::factory()->platformAdmin()->create())
            ->getJson('/api/finance/expenses')->assertStatus(403);
    }

    // ── Tenant isolation ──────────────────────────────────────────────────────

    public function test_school_a_cannot_see_school_b_expenses(): void
    {
        $a = $this->school(); $b = $this->school();
        $this->expense($b, $this->admin($b));

        $res = $this->actingAs($this->accountant($a))->getJson('/api/finance/expenses')->assertOk();
        $this->assertEmpty($res->json('data'));
    }

    public function test_cross_school_expense_category_rejected(): void
    {
        $a = $this->school(); $b = $this->school();
        $catB = $this->expCat($b);

        $this->actingAs($this->accountant($a))
            ->postJson('/api/finance/expenses', [
                'expense_category_id' => $catB->id,
                'expense_date' => now()->toDateString(), 'amount' => 50,
            ])
            ->assertUnprocessable()->assertJsonValidationErrors('expense_category_id');
    }

    // ── Expense lifecycle + cashbook ──────────────────────────────────────────

    public function test_expense_full_lifecycle_creates_cashbook_on_paid(): void
    {
        $s = $this->school();
        $acc = $this->accountant($s);
        $exp = $this->expense($s, $acc, ['amount' => 320.00]);

        // draft → approved
        $this->actingAs($acc)->postJson("/api/finance/expenses/{$exp->id}/approve")
            ->assertOk()->assertJsonPath('status', 'approved');

        // approved → paid (creates cashbook expense entry)
        $this->actingAs($acc)->postJson("/api/finance/expenses/{$exp->id}/mark-paid")
            ->assertOk()->assertJsonPath('status', 'paid');

        $this->assertDatabaseHas('cashbook_entries', [
            'school_id' => $s->id, 'entry_type' => 'expense',
            'reference_type' => 'expense', 'reference_id' => $exp->id, 'amount' => 320.00,
        ]);
    }

    public function test_cannot_pay_unapproved_expense(): void
    {
        $s = $this->school();
        $acc = $this->accountant($s);
        $exp = $this->expense($s, $acc); // draft

        $this->actingAs($acc)->postJson("/api/finance/expenses/{$exp->id}/mark-paid")
            ->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    public function test_paid_expense_cannot_be_edited(): void
    {
        $s = $this->school();
        $acc = $this->accountant($s);
        $exp = $this->expense($s, $acc, ['status' => 'paid']);

        $this->actingAs($acc)->patchJson("/api/finance/expenses/{$exp->id}", ['amount' => 999])
            ->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    public function test_mark_paid_is_idempotent_no_duplicate_cashbook(): void
    {
        $s = $this->school();
        $exp = $this->expense($s, $this->accountant($s), ['status' => 'approved']);

        app(\App\Services\ExpenseService::class)->markPaid($exp);
        // Second call on an already-paid expense throws, but the cashbook guard also protects:
        app(CashbookService::class)->recordExpensePayment($exp->fresh());

        $count = CashbookEntry::withoutTenantScope()
            ->where('reference_type', 'expense')->where('reference_id', $exp->id)->count();
        $this->assertEquals(1, $count);
    }

    // ── Cashbook income from payment ──────────────────────────────────────────

    public function test_successful_payment_creates_income_cashbook_entry(): void
    {
        $s = $this->school();
        $txn = $this->successfulTransaction($s, 250.00);

        app(CashbookService::class)->recordIncomeFromTransaction($txn);

        $this->assertDatabaseHas('cashbook_entries', [
            'school_id' => $s->id, 'entry_type' => 'income',
            'reference_type' => 'transaction', 'reference_id' => $txn->id, 'amount' => 250.00,
        ]);
    }

    public function test_income_cashbook_is_idempotent(): void
    {
        $s = $this->school();
        $txn = $this->successfulTransaction($s, 100.00);

        $svc = app(CashbookService::class);
        $svc->recordIncomeFromTransaction($txn);
        $svc->recordIncomeFromTransaction($txn); // duplicate attempt

        $count = CashbookEntry::withoutTenantScope()
            ->where('reference_type', 'transaction')->where('reference_id', $txn->id)->count();
        $this->assertEquals(1, $count);
    }

    // ── Soft delete / restore ─────────────────────────────────────────────────

    public function test_income_category_soft_delete_and_restore(): void
    {
        $s = $this->school();
        $acc = $this->accountant($s);
        $cat = IncomeCategory::create(['school_id' => $s->id, 'name' => 'Donations', 'is_active' => true]);

        $this->actingAs($acc)->deleteJson("/api/finance/income-categories/{$cat->id}")->assertOk();
        $this->assertSoftDeleted('income_categories', ['id' => $cat->id]);

        $this->actingAs($acc)->postJson("/api/finance/income-categories/{$cat->id}/restore")->assertOk();
        $this->assertDatabaseHas('income_categories', ['id' => $cat->id, 'deleted_at' => null]);
    }

    public function test_expense_soft_delete_and_restore(): void
    {
        $s = $this->school();
        $acc = $this->accountant($s);
        $exp = $this->expense($s, $acc);

        $this->actingAs($acc)->deleteJson("/api/finance/expenses/{$exp->id}")->assertOk();
        $this->assertSoftDeleted('expenses', ['id' => $exp->id]);

        $this->actingAs($acc)->postJson("/api/finance/expenses/{$exp->id}/restore")->assertOk();
        $this->assertDatabaseHas('expenses', ['id' => $exp->id, 'deleted_at' => null]);
    }

    // ── Query validation ──────────────────────────────────────────────────────

    public function test_invalid_expense_status_filter_rejected(): void
    {
        $s = $this->school();
        $this->actingAs($this->accountant($s))
            ->getJson('/api/finance/expenses?status=bogus')
            ->assertUnprocessable();
    }

    public function test_per_page_over_100_rejected(): void
    {
        $s = $this->school();
        $this->actingAs($this->accountant($s))
            ->getJson('/api/finance/cashbook?per_page=500')
            ->assertUnprocessable();
    }

    // ── Dashboard aggregation ─────────────────────────────────────────────────

    public function test_dashboard_aggregates_scoped_to_school(): void
    {
        $a = $this->school(); $b = $this->school();
        CashbookEntry::create(['school_id' => $a->id, 'entry_type' => 'income', 'transaction_date' => now()->toDateString(), 'amount' => 500]);
        CashbookEntry::create(['school_id' => $a->id, 'entry_type' => 'expense', 'transaction_date' => now()->toDateString(), 'amount' => 200]);
        CashbookEntry::create(['school_id' => $b->id, 'entry_type' => 'income', 'transaction_date' => now()->toDateString(), 'amount' => 9999]);

        $res = $this->actingAs($this->accountant($a))->getJson('/api/finance/dashboard')->assertOk();
        $this->assertEquals(500, $res->json('income_today'));
        $this->assertEquals(300, $res->json('net_cash_position')); // 500 - 200, school B excluded
    }

    // ── Audit logging ─────────────────────────────────────────────────────────

    public function test_expense_create_is_audited(): void
    {
        $s = $this->school();
        $acc = $this->accountant($s);
        $cat = $this->expCat($s);

        $id = $this->actingAs($acc)->postJson('/api/finance/expenses', [
            'expense_category_id' => $cat->id, 'expense_date' => now()->toDateString(),
            'amount' => 75.50, 'vendor_name' => 'Acme',
        ])->assertCreated()->json('id');

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'created', 'model_type' => Expense::class, 'model_id' => $id,
        ]);
    }

    // ── DB-level cashbook idempotency (unique constraint) ─────────────────────

    public function test_db_constraint_blocks_duplicate_transaction_reference(): void
    {
        $s = $this->school();
        $txn = $this->successfulTransaction($s, 250.00);

        // First income entry via the service.
        app(CashbookService::class)->recordIncomeFromTransaction($txn);

        // A raw insert bypassing the service guard must be rejected by the DB
        // unique index (school_id, reference_type, reference_id).
        $this->expectException(\Illuminate\Database\UniqueConstraintViolationException::class);

        DB::table('cashbook_entries')->insert([
            'school_id'        => $s->id,
            'entry_type'       => 'income',
            'reference_type'   => 'transaction',
            'reference_id'     => $txn->id,
            'transaction_date' => now()->toDateString(),
            'amount'           => 250.00,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);
    }

    public function test_db_constraint_blocks_duplicate_expense_reference(): void
    {
        $s = $this->school();
        $exp = $this->expense($s, $this->accountant($s), ['status' => 'approved']);
        app(CashbookService::class)->recordExpensePayment($exp); // creates the expense cashbook entry

        $this->expectException(\Illuminate\Database\UniqueConstraintViolationException::class);

        DB::table('cashbook_entries')->insert([
            'school_id'        => $s->id,
            'entry_type'       => 'expense',
            'reference_type'   => 'expense',
            'reference_id'     => $exp->id,
            'transaction_date' => now()->toDateString(),
            'amount'           => $exp->amount,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);
    }

    public function test_unique_constraint_allows_multiple_null_reference_rows(): void
    {
        // Manual / un-referenced entries (NULL reference) remain unconstrained —
        // InnoDB treats NULLs as distinct — so the append-only ledger still works.
        $s = $this->school();

        CashbookEntry::create(['school_id' => $s->id, 'entry_type' => 'income',  'transaction_date' => now()->toDateString(), 'amount' => 100]);
        CashbookEntry::create(['school_id' => $s->id, 'entry_type' => 'expense', 'transaction_date' => now()->toDateString(), 'amount' => 50]);

        $count = CashbookEntry::withoutTenantScope()
            ->where('school_id', $s->id)
            ->whereNull('reference_type')
            ->count();

        $this->assertEquals(2, $count);
    }

    public function test_service_remains_idempotent_with_db_constraint(): void
    {
        // The application guard still short-circuits the common case (no exception),
        // and the DB constraint backstops races. Calling twice yields one entry.
        $s = $this->school();
        $txn = $this->successfulTransaction($s, 75.00);

        $svc = app(CashbookService::class);
        $first  = $svc->recordIncomeFromTransaction($txn);
        $second = $svc->recordIncomeFromTransaction($txn);

        $this->assertNotNull($first);
        $this->assertNull($second);
        $this->assertEquals(1, CashbookEntry::withoutTenantScope()
            ->where('reference_type', 'transaction')->where('reference_id', $txn->id)->count());
    }
}
