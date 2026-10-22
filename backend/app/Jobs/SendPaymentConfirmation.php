<?php

namespace App\Jobs;

use App\Mail\PaymentReceiptMail;
use App\Models\Transaction;
use App\Services\SmsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendPaymentConfirmation implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int    $tries   = 3;
    public array  $backoff = [60, 180, 600]; // 1min, 3min, 10min

    public function __construct(public Transaction $transaction) {}

    public function failed(\Throwable $e): void
    {
        Log::error('SendPaymentConfirmation: all retries exhausted', [
            'transaction_id'        => $this->transaction->id,
            'transaction_reference' => $this->transaction->transaction_reference,
            'school_id'             => $this->transaction->school_id,
            'error'                 => $e->getMessage(),
        ]);
        // The payment itself is settled correctly — only the notification failed.
        // Admin can manually resend by viewing the transaction and triggering retry.
    }

    public function handle(SmsService $sms): void
    {
        $transaction = $this->transaction->loadMissing(['invoice.student']);
        $invoice     = $transaction->invoice;
        $student     = $invoice->student;
        $contact     = $transaction->payer_phone_or_email;

        $message = $this->buildMessage($transaction, $invoice, $student);

        if (filter_var($contact, FILTER_VALIDATE_EMAIL)) {
            Mail::to($contact)->send(new PaymentReceiptMail($transaction));
            Log::info('SendPaymentConfirmation: email sent', [
                'to'      => $contact,
                'invoice' => $invoice->invoice_number,
                'amount'  => $transaction->amount,
            ]);
            return;
        }

        // SMS path — send to payer contact, also try parent phone if student record has one
        $recipients = array_filter(array_unique([
            SmsService::toE164($contact),
            $student->parent_phone ? SmsService::toE164($student->parent_phone) : null,
        ]));

        foreach ($recipients as $phone) {
            $result = $sms->send($phone, $message);

            if (!$result['success']) {
                Log::warning('SendPaymentConfirmation: SMS failed', [
                    'phone' => $phone,
                    'error' => $result['error'],
                ]);
            }
        }
    }

    private function buildMessage(Transaction $transaction, $invoice, $student): string
    {
        $school  = $student->school->name ?? 'School';
        $name    = $student->first_name . ' ' . $student->last_name;
        $amount  = number_format((float) $transaction->amount, 2);
        $balance = number_format((float) $invoice->balance_amount, 2);
        $inv     = $invoice->invoice_number;
        $curr    = $transaction->currency;

        if ($invoice->balance_amount <= 0) {
            return "{$school}: Payment of {$curr} {$amount} received for {$name} (Inv #{$inv}). "
                . "Account is now FULLY PAID. Thank you!";
        }

        return "{$school}: Payment of {$curr} {$amount} received for {$name} (Inv #{$inv}). "
            . "Outstanding balance: {$curr} {$balance}. Thank you!";
    }
}
