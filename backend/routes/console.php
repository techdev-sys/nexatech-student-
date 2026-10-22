<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Reconcile stale pending transactions every 30 minutes
// (catches payments that never received a webhook callback)
Schedule::command('payments:reconcile')->everyThirtyMinutes();

// Prune expired Sanctum tokens daily (keeps personal_access_tokens table lean)
Schedule::command('sanctum:prune-expired --hours=720')->daily();

// Enforce documented operational-data retention windows.
Schedule::command('data:prune-retention')->dailyAt('02:30');
