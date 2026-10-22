<?php

namespace App\Console\Commands;

use App\Models\School;
use Illuminate\Console\Command;
use Throwable;

class ProductionReadinessCheck extends Command
{
    protected $signature = 'production:check';

    protected $description = 'Fail unless critical production safety settings are configured';

    public function handle(): int
    {
        $checks = [
            'Environment is production' => app()->environment('production'),
            'Debug mode is disabled' => ! config('app.debug'),
            'Application URL uses HTTPS' => str_starts_with((string) config('app.url'), 'https://'),
            'Authentication cookie is Secure' => config('auth_cookie.secure') === true,
            'Public registration is disabled' => config('registration.public_enabled') === false,
            'Database is not SQLite' => config('database.default') !== 'sqlite',
            'Queue is asynchronous' => ! in_array(config('queue.default'), ['sync', 'null'], true),
            'Mail uses a delivery transport' => ! in_array(config('mail.default'), ['array', 'log'], true),
            'Cache is persistent' => ! in_array(config('cache.default'), ['array', 'null'], true),
            'Backup provider is documented' => filled(config('production.backup_provider')),
        ];

        try {
            $checks['Read-only demo school exists'] = School::query()->where('is_demo', true)->exists();
        } catch (Throwable) {
            $checks['Read-only demo school exists'] = false;
        }

        foreach ($checks as $label => $passed) {
            $this->components->{$passed ? 'info' : 'error'}(($passed ? 'PASS: ' : 'FAIL: ').$label);
        }

        if (in_array(false, $checks, true)) {
            $this->newLine();
            $this->error('Production readiness check failed. Correct every failed item before launch.');

            return self::FAILURE;
        }

        $this->newLine();
        $this->info('Production readiness check passed. Complete the external provider and restore drills in the runbook.');

        return self::SUCCESS;
    }
}
