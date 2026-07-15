<?php

namespace App\Services;

use App\Models\Expense;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExpenseService
{
    public function __construct(private CashbookService $cashbook) {}

    public function create(array $data): Expense
    {
        // Observer records the 'created' audit log.
        return Expense::create($data);
    }

    public function update(Expense $expense, array $data): Expense
    {
        // Paid/cancelled expenses are terminal — block edits to keep the cashbook honest.
        if (in_array($expense->status, ['paid', 'cancelled'], true)) {
            throw ValidationException::withMessages([
                'status' => ["A {$expense->status} expense can no longer be edited."],
            ]);
        }

        $expense->update($data);

        return $expense->fresh();
    }

    public function approve(Expense $expense): Expense
    {
        if ($expense->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ["Only draft expenses can be approved (current: {$expense->status})."],
            ]);
        }

        $expense->update(['status' => 'approved']);

        return $expense->fresh();
    }

    /**
     * Mark an approved expense as paid and record the cashbook expense entry
     * atomically. Idempotent via the cashbook reference guard.
     */
    public function markPaid(Expense $expense): Expense
    {
        if ($expense->status !== 'approved') {
            throw ValidationException::withMessages([
                'status' => ["Only approved expenses can be marked paid (current: {$expense->status})."],
            ]);
        }

        return DB::transaction(function () use ($expense) {
            $expense->update(['status' => 'paid']);
            $this->cashbook->recordExpensePayment($expense->fresh());

            return $expense->fresh();
        });
    }

    public function cancel(Expense $expense): Expense
    {
        if ($expense->status === 'paid') {
            throw ValidationException::withMessages([
                'status' => ['A paid expense cannot be cancelled.'],
            ]);
        }

        $expense->update(['status' => 'cancelled']);

        return $expense->fresh();
    }

    public function delete(Expense $expense): void
    {
        // Observer records the 'deleted' audit log.
        $expense->delete();
    }
}
