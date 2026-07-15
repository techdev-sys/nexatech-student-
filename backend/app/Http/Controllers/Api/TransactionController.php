<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Paynow\Payments\Paynow;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $transactions = Transaction::with(['invoice.student'])
            ->when($request->invoice_id, fn($q) => $q->where('invoice_id', $request->invoice_id))
            ->when($request->gateway, fn($q) => $q->where('gateway', $request->gateway))
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($transactions);
    }

    public function initiate(Request $request)
    {
        $data = $request->validate([
            'invoice_id'           => 'required|exists:invoices,id',
            'gateway'              => 'nullable|in:paynow,stitch,payfast,manual',
            'amount'               => 'required|numeric|min:0.01',
            'payer_phone_or_email' => 'nullable|string|max:150',
        ]);

        $invoice = Invoice::with('feeStructure')->findOrFail($data['invoice_id']);

        // Parents may only pay invoices belonging to their linked child
        if ($request->user()->isParent()) {
            $studentId = $request->user()->student?->id;
            if (!$studentId || $invoice->student_id !== $studentId) {
                return response()->json(['error' => 'Unauthorized.'], 403);
            }
        }

        if ((float) $data['amount'] > (float) $invoice->balance_amount) {
            return response()->json(['error' => 'Amount exceeds outstanding balance.'], 422);
        }

        $currency = $invoice->feeStructure->currency;
        $gateway  = $data['gateway'] ?? $this->resolveGateway($currency);

        $transaction = Transaction::create([
            'school_id'             => $request->user()->school_id,
            'invoice_id'            => $invoice->id,
            'transaction_reference' => 'TXN-' . strtoupper(Str::random(12)),
            'gateway'               => $gateway,
            'amount'                => $data['amount'],
            'currency'              => $currency,
            'status'                => 'pending',
            'payer_phone_or_email'  => $data['payer_phone_or_email'] ?? null,
        ]);

        $checkoutUrl = match ($gateway) {
            'paynow'  => $this->initiatePaynow($transaction, $invoice, $request->user()),
            'payfast' => $this->initiatePayfast($transaction, $invoice),
            'stitch'  => $this->initiateStitch($transaction, $invoice),
            'manual'  => $this->settleManual($transaction, $invoice),
        };

        if (!in_array($gateway, ['manual']) && !$checkoutUrl) {
            $transaction->update(['status' => 'failed']);
            return response()->json(['error' => 'Gateway rejected the payment request.'], 502);
        }

        return response()->json([
            'transaction'  => $transaction->fresh()->load('invoice'),
            'checkout_url' => $checkoutUrl,
        ], 201);
    }

    public function show(Transaction $transaction)
    {
        return response()->json($transaction->load(['invoice.student']));
    }

    // ── Manual settlement ────────────────────────────────────────────────────

    private function settleManual(Transaction $transaction, Invoice $invoice): null
    {
        DB::transaction(function () use ($transaction, $invoice) {
            $transaction->update([
                'status'     => 'successful',
                'settled_at' => now(),
            ]);

            $newPaid    = bcadd((string) $invoice->paid_amount, (string) $transaction->amount, 2);
            $newBalance = bcsub((string) $invoice->total_amount, $newPaid, 2);
            $newStatus  = (float) $newBalance <= 0 ? 'paid' : 'partially_paid';

            $invoice->update([
                'paid_amount'    => $newPaid,
                'balance_amount' => max(0, (float) $newBalance),
                'status'         => $newStatus,
            ]);

            // Record income in the cashbook (idempotent per transaction).
            app(\App\Services\CashbookService::class)->recordIncomeFromTransaction($transaction->fresh());
        });

        return null;
    }

    // ── Gateway resolution ──────────────────────────────────────────────────

    private function resolveGateway(string $currency): string
    {
        return match ($currency) {
            'ZAR'   => 'payfast',
            'USD', 'ZiG' => 'paynow',
            default => 'paynow',
        };
    }

    // ── Paynow (USD / ZiG — Zimbabwe rails) ────────────────────────────────

    private function initiatePaynow(Transaction $transaction, Invoice $invoice, $user): ?string
    {
        $paynow = new Paynow(
            config('services.paynow.integration_id'),
            config('services.paynow.integration_key'),
            route('paynow.return', ['tx_ref' => $transaction->transaction_reference]),
            url('/api/gateways/paynow/callback')
        );

        $payment = $paynow->createPayment($invoice->invoice_number, '');
        $payment->add($invoice->feeStructure->title, (float) $transaction->amount);

        try {
            $response = $paynow->send($payment);
        } catch (\Throwable $e) {
            Log::error('Paynow initiation failed', ['error' => $e->getMessage(), 'tx' => $transaction->transaction_reference]);
            return null;
        }

        if ($response->success()) {
            $transaction->update([
                'gateway_reference' => $response->pollUrl(),
            ]);
            return $response->redirectUrl();
        }

        Log::warning('Paynow rejected payment', ['errors' => $response->errors(), 'tx' => $transaction->transaction_reference]);
        return null;
    }

    // ── PayFast (ZAR — South African rails) ────────────────────────────────

    private function initiatePayfast(Transaction $transaction, Invoice $invoice): ?string
    {
        $merchant = [
            'merchant_id'  => config('services.payfast.merchant_id'),
            'merchant_key' => config('services.payfast.merchant_key'),
        ];

        $data = [
            'merchant_id'   => $merchant['merchant_id'],
            'merchant_key'  => $merchant['merchant_key'],
            'return_url'    => url('/payment/return'),
            'cancel_url'    => url('/payment/cancel'),
            'notify_url'    => url('/api/gateways/payfast/callback'),
            'm_payment_id'  => $transaction->transaction_reference,
            'amount'        => number_format((float) $transaction->amount, 2, '.', ''),
            'item_name'     => $invoice->feeStructure->title,
        ];

        if ($passphrase = config('services.payfast.passphrase')) {
            $data['passphrase'] = $passphrase;
        }

        $query     = http_build_query($data);
        $signature = md5($query);
        $data['signature'] = $signature;

        $transaction->update(['gateway_reference' => $transaction->transaction_reference]);

        return 'https://www.payfast.co.za/eng/process?' . http_build_query($data);
    }

    // ── Stitch (ZAR — instant EFT) ─────────────────────────────────────────

    private function initiateStitch(Transaction $transaction, Invoice $invoice): ?string
    {
        // Stitch requires an OAuth client_credentials token first, then a
        // PaymentInitiation mutation via their GraphQL API.
        // Full implementation: https://stitch.money/docs/payments/overview
        // Stub returns null until Stitch credentials are configured.
        Log::info('Stitch initiation stub — credentials not yet configured', [
            'tx' => $transaction->transaction_reference,
        ]);
        return null;
    }
}
