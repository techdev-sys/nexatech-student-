<?php

namespace App\Services;

use App\Models\CashbookEntry;
use App\Models\Expense;
use App\Models\Transaction;
use Illuminate\Database\UniqueConstraintViolationException;

class CashbookService
{
    /**
     * Record an income cashbook entry for a successful invoice payment.
     * Idempotent: a given transaction produces at most one income entry.
     *
     * Called from public webhook (no Auth user) and manual settlement, so
     * school_id is taken from the transaction, never from Auth.
     */
    public function recordIncomeFromTransaction(Transaction $transaction): ?CashbookEntry
    {
        $exists = CashbookEntry::withoutTenantScope()
            ->where('reference_type', 'transaction')
            ->where('reference_id', $transaction->id)
            ->exists();

        if ($exists) {
            return null;
        }

        try {
            return CashbookEntry::create([
                'school_id'          => $transaction->school_id,
                'entry_type'         => 'income',
                'reference_type'     => 'transaction',
                'reference_id'       => $transaction->id,
                'transaction_date'   => ($transaction->settled_at ?? now())->toDateString(),
                'amount'             => $transaction->amount,
                'description'        => "Invoice payment · {$transaction->transaction_reference}",
                'created_by_user_id' => null, // system / gateway-originated
            ]);
        } catch (UniqueConstraintViolationException) {
            // A concurrent request won the race; the entry already exists. Idempotent no-op.
            return null;
        }
    }

    /**
     * Record an expense cashbook entry when an expense is marked paid.
     * Idempotent per expense.
     */
    public function recordExpensePayment(Expense $expense): ?CashbookEntry
    {
        $exists = CashbookEntry::withoutTenantScope()
            ->where('reference_type', 'expense')
            ->where('reference_id', $expense->id)
            ->exists();

        if ($exists) {
            return null;
        }

        try {
            return CashbookEntry::create([
                'school_id'          => $expense->school_id,
                'entry_type'         => 'expense',
                'reference_type'     => 'expense',
                'reference_id'       => $expense->id,
                'transaction_date'   => ($expense->expense_date ?? now())->toDateString(),
                'amount'             => $expense->amount,
                'description'        => $expense->vendor_name
                    ? "Expense · {$expense->vendor_name}"
                    : 'Expense payment',
                'created_by_user_id' => $expense->created_by_user_id,
            ]);
        } catch (UniqueConstraintViolationException) {
            // A concurrent request won the race; the entry already exists. Idempotent no-op.
            return null;
        }
    }
}
