<?php

namespace App\Services;

use App\Models\Communication;
use App\Models\CommunicationDelivery;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class CommunicationDeliveryService
{
    public function __construct(private SmsService $sms) {}

    /**
     * Process all pending deliveries for a communication.
     * Returns [successful, failed].
     */
    public function processAll(Communication $comm): array
    {
        $deliveries = CommunicationDelivery::where('communication_id', $comm->id)
            ->where('delivery_status', 'pending')
            ->get();

        $successful = 0;
        $failed     = 0;

        foreach ($deliveries as $delivery) {
            $ok = match ($comm->channel) {
                'sms'          => $this->sendSms($delivery, $comm),
                'email'        => $this->sendEmail($delivery, $comm),
                'announcement' => $this->markAnnouncement($delivery),
                default        => false,
            };

            if ($ok) {
                $successful++;
            } else {
                $failed++;
            }
        }

        return [$successful, $failed];
    }

    // ── Channel handlers ──────────────────────────────────────────────────────

    private function sendSms(CommunicationDelivery $delivery, Communication $comm): bool
    {
        $phone = $delivery->recipient_phone;

        if (!$phone) {
            $this->markFailed($delivery, 'No phone number on file.');
            return false;
        }

        $e164   = SmsService::toE164($phone);
        $result = $this->sms->send($e164, $comm->body);

        if ($result['success']) {
            $delivery->update([
                'delivery_status'    => 'sent',
                'provider_reference' => $result['message_id'],
                'sent_at'            => now(),
            ]);
            return true;
        }

        $this->markFailed($delivery, $result['error'] ?? 'SMS provider error.');
        return false;
    }

    private function sendEmail(CommunicationDelivery $delivery, Communication $comm): bool
    {
        $email = $delivery->recipient_email;

        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->markFailed($delivery, 'No valid email address on file.');
            return false;
        }

        try {
            Mail::to($email)->send(new \App\Mail\CommunicationMail($comm, $delivery->recipient_name));

            $delivery->update([
                'delivery_status' => 'sent',
                'sent_at'         => now(),
            ]);

            return true;
        } catch (\Throwable $e) {
            Log::error('CommunicationDeliveryService: email failed', [
                'delivery_id' => $delivery->id,
                'email'       => $email,
                'error'       => $e->getMessage(),
            ]);
            $this->markFailed($delivery, $e->getMessage());
            return false;
        }
    }

    private function markAnnouncement(CommunicationDelivery $delivery): bool
    {
        $delivery->update([
            'delivery_status' => 'delivered',
            'delivered_at'    => now(),
        ]);
        return true;
    }

    private function markFailed(CommunicationDelivery $delivery, string $reason): void
    {
        $delivery->update([
            'delivery_status' => 'failed',
            'error_message'   => $reason,
            'failed_at'       => now(),
        ]);
    }
}
