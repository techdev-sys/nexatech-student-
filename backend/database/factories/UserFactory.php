<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'school_id'         => null,
            'role'              => 'teacher',
            'name'              => fake()->name(),
            'email'             => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password'          => static::$password ??= Hash::make('password'),
            'remember_token'    => Str::random(10),
        ];
    }

    public function unverified(): static
    {
        return $this->state(['email_verified_at' => null]);
    }

    public function admin(): static
    {
        return $this->state(['role' => 'admin']);
    }

    public function teacher(): static
    {
        return $this->state(['role' => 'teacher']);
    }

    public function asParent(): static
    {
        return $this->state(['role' => 'parent']);
    }

    public function platformAdmin(): static
    {
        return $this->state(['role' => 'platform_admin', 'school_id' => null]);
    }

    public function accountant(): static
    {
        return $this->state(['role' => 'accountant']);
    }

    public function forSchool(int $schoolId): static
    {
        return $this->state(['school_id' => $schoolId]);
    }
}
