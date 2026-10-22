<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordNotification;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class AuthenticationRecoveryTest extends TestCase
{
    use DatabaseTransactions;

    public function test_login_uses_http_only_cookie_and_does_not_return_token(): void
    {
        $school = School::factory()->create();
        User::factory()->forSchool($school->id)->create([
            'email' => 'login@example.test',
            'password' => Hash::make('StrongPassword123!'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'login@example.test',
            'password' => 'StrongPassword123!',
        ]);

        $response->assertOk()
            ->assertCookie(config('auth_cookie.name'))
            ->assertJsonMissingPath('token');

        $cookie = collect($response->headers->getCookies())
            ->first(fn ($item) => $item->getName() === config('auth_cookie.name'));
        $this->assertTrue($cookie->isHttpOnly());

        $this->withCookie(config('auth_cookie.name'), $cookie->getValue())
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('email', 'login@example.test');
    }

    public function test_password_recovery_is_non_enumerating_and_resets_password(): void
    {
        Notification::fake();
        $school = School::factory()->create();
        $user = User::factory()->forSchool($school->id)->create(['email' => 'recover@example.test']);
        $user->createToken('existing-session');

        $this->postJson('/api/forgot-password', ['email' => 'missing@example.test'])
            ->assertOk()
            ->assertJsonPath('message', 'If the account exists, a password reset link has been sent.');

        $this->postJson('/api/forgot-password', ['email' => $user->email])
            ->assertOk()
            ->assertJsonPath('message', 'If the account exists, a password reset link has been sent.');

        Notification::assertSentTo($user, ResetPasswordNotification::class);

        $token = Password::createToken($user);
        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'ReplacementPassword123!',
            'password_confirmation' => 'ReplacementPassword123!',
        ])->assertOk();

        $this->assertTrue(Hash::check('ReplacementPassword123!', $user->fresh()->password));
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);
    }

    public function test_account_password_change_requires_current_password_and_revokes_sessions(): void
    {
        $school = School::factory()->create();
        $user = User::factory()->forSchool($school->id)->create([
            'email' => 'change@example.test',
            'password' => Hash::make('OriginalPassword123!'),
        ]);
        $token = $user->createToken('existing-session')->plainTextToken;

        $this->withToken($token)->postJson('/api/change-password', [
            'current_password' => 'incorrect',
            'password' => 'ReplacementPassword123!',
            'password_confirmation' => 'ReplacementPassword123!',
        ])->assertUnprocessable();

        $this->withToken($token)->postJson('/api/change-password', [
            'current_password' => 'OriginalPassword123!',
            'password' => 'ReplacementPassword123!',
            'password_confirmation' => 'ReplacementPassword123!',
        ])->assertOk();

        $this->assertTrue(Hash::check('ReplacementPassword123!', $user->fresh()->password));
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);
        $this->withToken($token)->getJson('/api/me')->assertUnauthorized();
    }
}
