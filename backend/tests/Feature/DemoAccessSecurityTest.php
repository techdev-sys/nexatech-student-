<?php

namespace Tests\Feature;

use App\Mail\DemoAccessCodeMail;
use App\Mail\DemoRequestReceivedMail;
use App\Models\DemoRequest;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

class DemoAccessSecurityTest extends TestCase
{
    use DatabaseTransactions;

    public function test_new_demo_request_queues_an_admin_notification(): void
    {
        Mail::fake();
        config(['demo.request_notification_email' => 'owner@example.test']);

        $this->postJson('/api/demo-requests', [
            'name' => 'Evaluation User',
            'institution' => 'Evaluation School',
            'email' => 'EVALUATOR@EXAMPLE.TEST',
            'phone' => '+263 77 123 4567',
            'role' => 'Head Teacher',
            'country' => 'Zimbabwe',
        ])->assertCreated()
            ->assertJsonPath('request.email', 'evaluator@example.test')
            ->assertJsonPath('request.status', 'pending');

        Mail::assertQueued(DemoRequestReceivedMail::class, function (DemoRequestReceivedMail $mail) {
            return $mail->hasTo('owner@example.test')
                && $mail->demoRequest->email === 'evaluator@example.test';
        });
    }

    public function test_public_registration_is_disabled_by_default(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Untrusted User',
            'email' => 'untrusted@example.test',
            'password' => 'StrongPassword123!',
            'password_confirmation' => 'StrongPassword123!',
            'school_name' => 'Untrusted School',
            'school_email' => 'school@example.test',
        ])->assertNotFound();
    }

    public function test_approved_code_is_hashed_emailed_and_redeemable_once(): void
    {
        Mail::fake();

        $platformAdmin = User::factory()->platformAdmin()->create();
        $request = DemoRequest::create([
            'name' => 'Evaluation User',
            'institution' => 'Evaluation School',
            'email' => 'evaluator@example.test',
            'status' => 'pending',
        ]);

        $school = School::factory()->create([
            'name' => 'Isolated Demo School',
            'email' => config('demo.school_email'),
            'is_demo' => true,
        ]);
        User::factory()->forSchool($school->id)->admin()->create([
            'email' => 'demo-admin@example.test',
            'is_demo' => true,
            'password' => Hash::make(Str::random(64)),
        ]);

        $this->actingAs($platformAdmin)
            ->postJson("/api/v1/platform/demo-requests/{$request->id}/approve")
            ->assertOk()
            ->assertJsonMissingPath('request.access_code');

        $plainCode = null;
        Mail::assertQueued(DemoAccessCodeMail::class, function (DemoAccessCodeMail $mail) use (&$plainCode) {
            $plainCode = $mail->accessCode;

            return $mail->hasTo('evaluator@example.test');
        });

        $this->assertNotNull($plainCode);
        $request->refresh();
        $this->assertSame(DemoRequest::hashAccessCode($plainCode), $request->access_code_hash);
        $this->assertNull($request->access_code);
        $this->assertNotSame($plainCode, $request->access_code_hash);

        $this->postJson('/api/demo/redeem', [
            'email' => 'evaluator@example.test',
            'access_code' => $plainCode,
            'role' => 'admin',
        ])->assertOk()
            ->assertCookie(config('auth_cookie.name'))
            ->assertJsonMissingPath('token')
            ->assertJsonPath('user.is_demo', true)
            ->assertJsonPath('user.school.is_demo', true);

        $request->refresh();
        $this->assertNotNull($request->redeemed_at);

        $this->postJson('/api/demo/redeem', [
            'email' => 'evaluator@example.test',
            'access_code' => $plainCode,
            'role' => 'admin',
        ])->assertUnprocessable();
    }

    public function test_expired_code_cannot_be_redeemed(): void
    {
        $code = 'EXPIRED1-EXPIRED2';
        DemoRequest::create([
            'name' => 'Expired User',
            'institution' => 'Expired School',
            'email' => 'expired@example.test',
            'status' => 'approved',
            'access_code_hash' => DemoRequest::hashAccessCode($code),
            'access_code_expires_at' => now()->subMinute(),
        ]);

        $this->postJson('/api/demo/redeem', [
            'email' => 'expired@example.test',
            'access_code' => $code,
            'role' => 'teacher',
        ])->assertUnprocessable();
    }

    public function test_demo_user_can_read_but_cannot_mutate(): void
    {
        $school = School::factory()->create(['is_demo' => true]);
        $demoAdmin = User::factory()->forSchool($school->id)->admin()->create(['is_demo' => true]);

        $this->actingAs($demoAdmin)->getJson('/api/students')->assertOk();
        $this->actingAs($demoAdmin)->postJson('/api/students', [])->assertForbidden();
        $this->actingAs($demoAdmin)->postJson('/api/transactions/initiate', [])->assertForbidden();
    }
}
