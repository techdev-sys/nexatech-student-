<?php

namespace Tests\Feature;

use App\Models\{School, User, Student, Grade, Attendance};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DemoVisitorTest extends TestCase
{
    use RefreshDatabase;

    public function test_visitor_can_login_and_read_sample_data_but_cannot_write(): void
    {
        $school = School::create(['name' => 'Demo', 'email' => config('demo.school_email'), 'is_demo' => true, 'is_active' => true]);
        User::create(['name' => 'Teacher', 'email' => 'teacher@nexatech.invalid', 'school_id' => $school->id, 'role' => 'teacher', 'is_demo' => true, 'password' => Hash::make('test-only-password')]);
        putenv('DEMO_VISITOR_PASSWORD_HASH='.Hash::make('test-only-visitor-password'));
        try {
            $this->artisan('demo:provision-visitor')->assertSuccessful();
            $this->artisan('demo:provision-visitor')->assertSuccessful();
            $this->assertSame(12, Student::count());
            $this->assertSame(48, Grade::count());
            $this->assertSame(240, Attendance::count());
            $this->postJson('/api/login', ['email' => 'demo-visitor@nexatech.invalid', 'password' => 'test-only-visitor-password'])
                ->assertOk()->assertJsonPath('user.is_demo', true);
            $visitor = User::where('email', 'demo-visitor@nexatech.invalid')->firstOrFail();
            $this->actingAs($visitor)->getJson('/api/students')->assertOk();
            $this->actingAs($visitor)->postJson('/api/students', [])->assertForbidden();
        } finally {
            putenv('DEMO_VISITOR_PASSWORD_HASH');
        }
    }
}
