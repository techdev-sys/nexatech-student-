<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendPaymentConfirmation;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function handle(Request $request, string $gateway)
    {
        $raw = $request->getContent();
        $payload = $request->all();

        Log::info("Webhook [{$gateway}] received", [
            'reference' => $payload['reference'] ?? $payload['m_payment_id'] ?? $payload['id'] ?? null,
            'status' => $payload['status'] ?? $payload['payment_status'] ?? null,
        ]);

        if (!$this->verifySignature($gateway, $request, $raw)) {
            Log::warning("Webhook [{$gateway}] signature verification failed");
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        [$reference, $isSuccessful] = match ($gateway) {
            'paynow'  => $this->parsePaynow($payload),
            'stitch'  => $this->parseStitch($payload),
            'payfast' => $this->parsePayfast($payload),
            default   => [null, false],
        };

        if (!$reference) {
            return response()->json(['error' => 'Unrecognised payload'], 422);
        }

        $transaction = Transaction::withoutGlobalScope('tenant')
            ->where('transaction_reference', $reference)
            ->first();

        if (!$transaction) {
            Log::warning("Webhook [{$gateway}] unknown reference: {$reference}");
            return response()->json(['error' => 'Transaction not found'], 404);
        }

        // Idempotency guard — already settled, just acknowledge
        if ($transaction->status === 'successful') {
            return response()->json(['status' => 'already_settled']);
        }

        if ($isSuccessful) {
            $this->settle($transaction, $gateway, $payload);
        } else {
            $transaction->update([
                'status'               => 'failed',
                'gateway_raw_response' => $payload,
            ]);
        }

        return response()->json(['status' => 'ok']);
    }

    private function settle(Transaction $transaction, string $gateway, array $payload): void
    {
        DB::transaction(function () use ($transaction, $gateway, $payload) {
            $transaction->update([
                'status'               => 'successful',
                'gateway_reference'    => $payload['gateway_ref'] ?? $payload['id'] ?? null,
                'gateway_raw_response' => $payload,
                'settled_at'           => now(),
            ]);

            $invoice = $transaction->invoice()->lockForUpdate()->first();

            $newPaid    = bcadd((string) $invoice->paid_amount, (string) $transaction->amount, 2);
            $newBalance = bcsub((string) $invoice->total_amount, $newPaid, 2);
            $newStatus  = $newBalance <= 0 ? 'paid' : 'partially_paid';

            $invoice->update([
                'paid_amount'    => $newPaid,
                'balance_amount' => max(0, $newBalance),
                'status'         => $newStatus,
            ]);

            // Record income in the cashbook (idempotent per transaction).
            app(\App\Services\CashbookService::class)->recordIncomeFromTransaction($transaction->fresh());
        });

        SendPaymentConfirmation::dispatch($transaction->fresh());
    }

    // ── Signature verification per gateway ──────────────────────────────────

    private function verifySignature(string $gateway, Request $request, string $raw): bool
    {
        return match ($gateway) {
            'paynow'  => $this->verifyPaynow($request, $raw),
            'stitch'  => $this->verifyStitch($request, $raw),
            'payfast' => $this->verifyPayfast($request),
            default   => false,
        };
    }

    private function verifyPaynow(Request $request, string $raw): bool
    {
        // Paynow sends a hash field in the POST body; recompute and compare.
        $secret   = config('services.paynow.integration_key');
        if (!$secret) {
            return false;
        }
        $received = strtoupper($request->input('hash', ''));
        $values   = collect($request->except('hash'))->sortKeys();
        $string   = $values->values()->implode('') . $secret;
        $expected = strtoupper(hash('md5', $string));

        return hash_equals($expected, $received);
    }

    private function verifyStitch(Request $request, string $raw): bool
    {
        // Stitch sends a HMAC-SHA256 signature in the X-Stitch-Signature header.
        $secret    = config('services.stitch.webhook_secret');
        if (!$secret) {
            return false;
        }
        $signature = $request->header('X-Stitch-Signature', '');
        $expected  = 'sha256=' . hash_hmac('sha256', $raw, $secret);

        return hash_equals($expected, $signature);
    }

    private function verifyPayfast(Request $request): bool
    {
        // PayFast uses IP allow-listing and a signature parameter.
        $allowed = ['197.97.145.144', '41.74.179.194', '41.74.179.195', '41.74.179.196'];
        if (!in_array($request->ip(), $allowed)) {
            return false;
        }
        $secret    = config('services.payfast.passphrase');
        if (!$secret) {
            return false;
        }
        $params    = collect($request->except('signature'))->sortKeys();
        $string    = $params->map(fn($v, $k) => "{$k}=" . urlencode(trim($v)))->implode('&');
        if ($secret) {
            $string .= '&passphrase=' . urlencode(trim($secret));
        }
        return hash_equals(md5($string), $request->input('signature', ''));
    }

    // ── Payload parsers — return [reference, isSuccessful] ──────────────────

    private function parsePaynow(array $p): array
    {
        return [$p['reference'] ?? null, strtolower($p['status'] ?? '') === 'paid'];
    }

    private function parseStitch(array $p): array
    {
        $ref    = $p['data']['paymentInitiation']['id'] ?? $p['id'] ?? null;
        $status = strtolower($p['data']['paymentInitiation']['status'] ?? $p['status'] ?? '');
        return [$ref, $status === 'completed'];
    }

    private function parsePayfast(array $p): array
    {
        return [$p['m_payment_id'] ?? null, ($p['payment_status'] ?? '') === 'COMPLETE'];
    }
}
