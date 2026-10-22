<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class BootstrapPlatformAdmin extends Command
{
    protected $signature = 'platform:bootstrap-admin';

    protected $description = 'Create the first platform administrator from one-time environment variables';

    public function handle(): int
    {
        if (! app()->environment('production')) {
            $this->error('This command is only available in production.');

            return self::FAILURE;
        }

        $email = strtolower(trim((string) getenv('BOOTSTRAP_PLATFORM_ADMIN_EMAIL')));
        $passwordHash = (string) getenv('BOOTSTRAP_PLATFORM_ADMIN_PASSWORD_HASH');

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)
            || ! preg_match('/^\$2[aby]\$\d{2}\$[.\/A-Za-z0-9]{53}$/', $passwordHash)) {
            $this->error('A valid bootstrap email and bcrypt password hash are required.');

            return self::FAILURE;
        }

        try {
            $created = DB::transaction(function () use ($email, $passwordHash): bool {
                if (User::query()->where('role', 'platform_admin')->exists()) {
                    throw new RuntimeException('A platform administrator already exists.');
                }

                if (User::query()->where('email', $email)->exists()) {
                    throw new RuntimeException('The requested email already belongs to another account.');
                }

                $user = new User();
                $user->forceFill([
                    'school_id' => null,
                    'name' => 'Platform Administrator',
                    'email' => $email,
                    'password' => $passwordHash,
                    'role' => 'platform_admin',
                    'is_demo' => false,
                    'email_verified_at' => now(),
                ])->save();

                return true;
            });
        } catch (RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        if ($created) {
            $this->info('Created the first platform administrator: '.$email);
            $this->warn('Remove the bootstrap environment variables immediately.');
        }

        return self::SUCCESS;
    }
}
