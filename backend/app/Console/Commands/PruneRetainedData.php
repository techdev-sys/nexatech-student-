<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PruneRetainedData extends Command
{
    protected $signature = 'data:prune-retention {--dry-run : Report eligible records without deleting them}';
    protected $description = 'Delete operational records that have passed the configured retention period.';

    public function handle(): int
    {
        $targets = [
            'demo_requests' => ['column' => 'created_at', 'days' => config('retention.demo_requests_days')],
            'communication_deliveries' => ['column' => 'created_at', 'days' => config('retention.communication_deliveries_days')],
            'activity_logs' => ['column' => 'created_at', 'days' => config('retention.activity_logs_days')],
        ];

        foreach ($targets as $table => $policy) {
            $query = DB::table($table)->where($policy['column'], '<', now()->subDays($policy['days']));
            $count = $query->count();
            $this->line("{$table}: {$count} record(s) older than {$policy['days']} days");

            if (!$this->option('dry-run') && $count > 0) {
                $query->delete();
            }
        }

        return self::SUCCESS;
    }
}
