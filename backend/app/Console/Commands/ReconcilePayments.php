<?php

namespace App\Console\Commands;

use App\Models\Transaction;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Finds payment transactions stuck in 'pending' for more than 30 minutes
 * and marks them as 'failed' so the invoice ledger doesn't remain inconsistent.
 *
 * Run via: php artisan payments:reconcile
 * Schedule in routes/console.php: Schedule::command('payments:reconcile')->everyThirtyMinutes();
 */
class ReconcilePayments extends Command
{
    protected $signature   = 'payments:reconcile {--dry-run : List stale transactions without updating them}';
    protected $description = 'Mark stale pending transactions as failed to keep invoice balances accurate.';

    public function handle(): int
    {
        $cutoff = now()->subMinutes(30);

        $stale = Transaction::withoutGlobalScopes()
            ->where('status', 'pending')
            ->where('created_at', '<', $cutoff)
            ->get();

        if ($stale->isEmpty()) {
            $this->info('No stale pending transactions found.');
            return self::SUCCESS;
        }

        $this->table(
            ['ID', 'Reference', 'Gateway', 'Amount', 'Created At'],
            $stale->map(fn($t) => [$t->id, $t->transaction_reference, $t->gateway, $t->amount, $t->created_at])
        );

        if ($this->option('dry-run')) {
            $this->warn("Dry run — no changes made. Found {$stale->count()} stale transaction(s).");
            return self::SUCCESS;
        }

        $count = 0;
        foreach ($stale as $tx) {
            $tx->update(['status' => 'failed']);
            Log::warning('ReconcilePayments: marked stale transaction as failed', [
                'id'        => $tx->id,
                'reference' => $tx->transaction_reference,
                'gateway'   => $tx->gateway,
                'school_id' => $tx->school_id,
            ]);
            $count++;
        }

        $this->info("Reconciled {$count} stale transaction(s).");
        return self::SUCCESS;
    }
}
