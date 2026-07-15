<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    private string $baseUrl;
    private string $username;
    private string $apiKey;
    private string $senderId;

    public function __construct()
    {
        $sandbox        = config('services.africastalking.sandbox', true);
        $this->baseUrl  = $sandbox
            ? 'https://api.sandbox.africastalking.com/version1/messaging'
            : 'https://api.africastalking.com/version1/messaging';
        $this->username = config('services.africastalking.username', 'sandbox');
        $this->apiKey   = config('services.africastalking.api_key', '');
        $this->senderId = config('services.africastalking.sender', '');
    }

    /**
     * Send an SMS to one or more recipients.
     *
     * @param  string|array  $to   E.164 numbers e.g. "+263771234567" or ["+263...", "+27..."]
     * @param  string        $message
     * @return array{success: bool, message_id: string|null, error: string|null}
     */
    public function send(string|array $to, string $message): array
    {
        if (empty($this->apiKey)) {
            Log::warning('SmsService: AT_API_KEY not configured — SMS skipped', ['to' => $to]);
            return ['success' => false, 'message_id' => null, 'error' => 'API key not configured'];
        }

        $recipients = is_array($to) ? implode(',', $to) : $to;

        $payload = [
            'username' => $this->username,
            'to'       => $recipients,
            'message'  => $message,
        ];

        if (!empty($this->senderId)) {
            $payload['from'] = $this->senderId;
        }

        try {
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'apiKey' => $this->apiKey,
            ])->asForm()->post($this->baseUrl, $payload);

            $body = $response->json();

            if ($response->successful() && isset($body['SMSMessageData']['Recipients'][0])) {
                $recipient = $body['SMSMessageData']['Recipients'][0];
                $messageId = $recipient['messageId'] ?? null;
                $status    = $recipient['status'] ?? 'unknown';

                Log::info('SmsService: SMS sent', [
                    'to'         => $recipients,
                    'message_id' => $messageId,
                    'status'     => $status,
                ]);

                return ['success' => true, 'message_id' => $messageId, 'error' => null];
            }

            $error = $body['SMSMessageData']['Message'] ?? $response->body();
            Log::warning('SmsService: AT rejected SMS', ['error' => $error, 'to' => $recipients]);

            return ['success' => false, 'message_id' => null, 'error' => $error];

        } catch (\Throwable $e) {
            Log::error('SmsService: HTTP request failed', ['error' => $e->getMessage(), 'to' => $recipients]);
            return ['success' => false, 'message_id' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * Format a local phone number to E.164.
     * Handles Zimbabwe (+263) and South Africa (+27) prefixes.
     */
    public static function toE164(string $phone, string $defaultCountry = 'ZW'): string
    {
        $digits = preg_replace('/\D/', '', $phone);

        // Already has full country code
        if (str_starts_with($phone, '+')) {
            return '+' . $digits;
        }

        $prefixes = ['ZW' => '263', 'ZA' => '27', 'ZM' => '260', 'BW' => '267'];
        $cc       = $prefixes[$defaultCountry] ?? '263';

        // Strip leading 0 (local format: 0771234567 → 263771234567)
        $digits = ltrim($digits, '0');

        // If already prefixed with country code digits, don't double-add
        if (str_starts_with($digits, $cc)) {
            return '+' . $digits;
        }

        return '+' . $cc . $digits;
    }
}
