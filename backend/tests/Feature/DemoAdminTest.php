<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DemoAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_admin_can_login_and_write_without_password_reset_on_redeploy(): void
    {
        putenv('DEMO_ADMIN_EMAIL=admin@example.test');
        putenv('DEMO_ADMIN_PASSWORD_HASH='.Hash::make('test-password'));
        try {
            $this->artisan('demo:provision-admin')->assertSuccessful();
            $this->postJson('/api/login', ['email' => 'admin@example.test', 'password' => 'test-password'])
                ->assertOk()->assertJsonPath('user.role', 'admin')->assertJsonPath('user.is_demo', false);
            $user = User::where('email', 'admin@example.test')->firstOrFail();
            $this->actingAs($user)->postJson('/api/subjects', ['name' => 'Demo Subject', 'grade_level' => 'Form 1', 'code' => 'DEMO'])->assertCreated();
            $user->update(['password' => Hash::make('changed-password')]);
            $this->artisan('demo:provision-admin')->assertSuccessful();
            $this->assertTrue(Hash::check('changed-password', $user->fresh()->password));
            $this->assertSame(1, User::count());
        } finally {
            putenv('DEMO_ADMIN_EMAIL');
            putenv('DEMO_ADMIN_PASSWORD_HASH');
        }
    }
}
