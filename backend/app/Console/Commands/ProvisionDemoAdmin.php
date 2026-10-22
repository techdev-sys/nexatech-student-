<?php

namespace App\Console\Commands;

use App\Models\School;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ProvisionDemoAdmin extends Command
{
    protected $signature = 'demo:provision-admin';
    protected $description = 'Create an isolated demonstration workspace with a writable school admin';

    public function handle(): int
    {
        $email = strtolower(trim((string) getenv('DEMO_ADMIN_EMAIL')));
        $hash = trim((string) getenv('DEMO_ADMIN_PASSWORD_HASH'));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)
            || ! preg_match('/^\$2[aby]\$\d{2}\$[.\/A-Za-z0-9]{53}$/', $hash)) {
            $this->error('A valid DEMO_ADMIN_EMAIL and bcrypt DEMO_ADMIN_PASSWORD_HASH are required.');
            return self::FAILURE;
        }

        DB::transaction(function () use ($email, $hash) {
            $existing = User::where('email', $email)->first();
            if ($existing) {
                if ($existing->role !== 'admin' || $existing->is_demo
                    || ! $existing->school?->is_demo || $existing->school->email !== $email) {
                    throw new RuntimeException('Email belongs to another account; refusing to modify it.');
                }
                // Subsequent releases must not reset the password or modify the workspace.
                return;
            }
            if (School::where('email', $email)->exists()) {
                throw new RuntimeException('School email already exists; refusing to attach a new administrator.');
            }
            $school = School::create([
                'name' => 'Scholaris Seke Demo School', 'email' => $email,
                'address' => 'Isolated demonstration workspace', 'is_active' => true, 'is_demo' => true,
            ]);
            User::forceCreate([
                'school_id' => $school->id, 'name' => 'Demo Administrator',
                'email' => $email, 'password' => $hash, 'role' => 'admin',
                // is_demo on users means read-only; this administrator needs write access.
                'is_demo' => false, 'email_verified_at' => now(),
            ]);
        });
        $this->info('Writable demo administrator ready: '.$email);
        return self::SUCCESS;
    }
}
