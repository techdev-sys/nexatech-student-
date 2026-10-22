<?php

namespace Tests\Feature;

use App\Jobs\SendPaymentConfirmation;
use App\Mail\PaymentReceiptMail;
use App\Models\FeeStructure;
use App\Models\Invoice;
use App\Models\School;
use App\Models\Student;
use App\Models\Transaction;
use App\Services\SmsService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentDeliverySecurityTest extends TestCase
{
    use DatabaseTransactions;

    private function paymentFixture(string $contact = 'payer@example.test'): Transaction
    {
        $school = School::factory()->create();
        $student = Student::factory()->create(['school_id' => $school->id]);
        $fee = FeeStructure::create([
            'school_id' => $school->id,
            'title' => 'Synthetic tuition',
            'academic_year' => '2026',
            'term' => 1,
            'amount' => 100,
            'currency' => 'USD',
        ]);
        $invoice = Invoice::create([
            'school_id' => $school->id,
            'student_id' => $student->id,
            'fee_structure_id' => $fee->id,
            'invoice_number' => 'TEST-'.uniqid(),
            'total_amount' => 100,
            'paid_amount' => 0,
            'balance_amount' => 100,
            'status' => 'unpaid',
            'due_date' => now()->addMonth()->toDateString(),
        ]);

        return Transaction::withoutGlobalScopes()->create([
            'school_id' => $school->id,
            'invoice_id' => $invoice->id,
            'transaction_reference' => 'TXN-'.strtoupper(uniqid()),
            'gateway' => 'paynow',
            'amount' => 25,
            'currency' => 'USD',
            'status' => 'pending',
            'payer_phone_or_email' => $contact,
        ]);
    }

    public function test_webhook_fails_closed_without_a_configured_secret(): void
    {
        config(['services.paynow.integration_key' => null]);

        $this->postJson('/api/gateways/paynow/callback', [
            'reference' => 'TXN-UNKNOWN',
            'status' => 'paid',
            'hash' => strtoupper(md5('paidTXN-UNKNOWN')),
        ])->assertUnauthorized();
    }

    public function test_valid_webhook_is_idempotent_and_dispatches_confirmation_once(): void
    {
        Queue::fake();
        config(['services.paynow.integration_key' => 'test-webhook-secret']);
        $transaction = $this->paymentFixture();
        $payload = ['reference' => $transaction->transaction_reference, 'status' => 'paid'];
        $values = collect($payload)->sortKeys()->values()->implode('');
        $payload['hash'] = strtoupper(md5($values.'test-webhook-secret'));

        $this->postJson('/api/gateways/paynow/callback', $payload)->assertOk();
        $this->postJson('/api/gateways/paynow/callback', $payload)
            ->assertOk()
            ->assertJsonPath('status', 'already_settled');

        $this->assertSame('25.00', $transaction->invoice->fresh()->paid_amount);
        Queue::assertPushed(SendPaymentConfirmation::class, 1);
    }

    public function test_email_payment_receipt_is_sent(): void
    {
        Mail::fake();
        $transaction = $this->paymentFixture();

        (new SendPaymentConfirmation($transaction))->handle(app(SmsService::class));

        Mail::assertSent(PaymentReceiptMail::class, fn (PaymentReceiptMail $mail) => $mail->hasTo('payer@example.test'));
    }

    public function test_sms_delivery_uses_configured_provider_credentials(): void
    {
        config([
            'services.africastalking.api_key' => 'test-api-key',
            'services.africastalking.username' => 'test-user',
            'services.africastalking.sandbox' => true,
        ]);
        Http::fake([
            '*' => Http::response([
                'SMSMessageData' => [
                    'Recipients' => [[
                        'messageId' => 'test-message-id',
                        'status' => 'Success',
                    ]],
                ],
            ], 200),
        ]);

        $result = (new SmsService())->send('+263771234567', 'Synthetic delivery test');

        $this->assertTrue($result['success']);
        $this->assertSame('test-message-id', $result['message_id']);
        Http::assertSent(fn ($request) => $request->hasHeader('apiKey', 'test-api-key'));
    }
}
