<?php

namespace App\Jobs;

use App\Models\BehaviourIncident;
use App\Models\Student;
use App\Services\ActivityLogger;
use App\Services\SmsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendBehaviourIncidentNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int   $tries  = 3;
    public array $backoff = [60, 300, 900]; // 1min, 5min, 15min

    public function __construct(public BehaviourIncident $incident) {}

    public function handle(SmsService $sms): void
    {
        $incident = $this->incident->fresh();

        if (!$incident) {
            return;
        }

        // Idempotency guard — do not send duplicate notification
        if ($incident->parent_notified_at !== null) {
            return;
        }

        $student = $incident->student ?? Student::find($incident->student_id);
        $phone   = $student?->parent_phone ?? $student?->parentUser?->phone ?? null;

        if (!$phone) {
            Log::info('BehaviourNotification: no parent phone on file', ['incident_id' => $incident->id]);
            ActivityLogger::logRaw('behaviour_incident.notification_skipped', BehaviourIncident::class, $incident->id, [
                'reason' => 'no_parent_phone',
            ]);
            return;
        }

        $e164    = SmsService::toE164($phone);
        $message = $this->buildMessage($student, $incident);
        $result  = $sms->send($e164, $message);

        if ($result['success']) {
            $incident->update(['parent_notified_at' => now()]);

            ActivityLogger::logRaw('behaviour_incident.notification_sent', BehaviourIncident::class, $incident->id, [
                'phone'      => $e164,
                'message_id' => $result['message_id'],
            ]);
        } else {
            ActivityLogger::logRaw('behaviour_incident.notification_failed', BehaviourIncident::class, $incident->id, [
                'error' => $result['error'],
            ]);

            // Throw to trigger retry with exponential backoff
            throw new \RuntimeException("SMS send failed: {$result['error']}");
        }
    }

    public function failed(\Throwable $e): void
    {
        Log::error('BehaviourNotification: all retries exhausted', [
            'incident_id' => $this->incident->id,
            'error'       => $e->getMessage(),
        ]);

        ActivityLogger::logRaw('behaviour_incident.notification_exhausted', BehaviourIncident::class, $this->incident->id, [
            'error' => $e->getMessage(),
        ]);
    }

    private function buildMessage(Student $student, BehaviourIncident $incident): string
    {
        $name     = $student->full_name;
        $typeName = $incident->incidentType?->name ?? 'Behaviour Incident';
        $date     = $incident->incident_date->format('d M Y');
        $points   = $incident->points > 0 ? "+{$incident->points}" : (string) $incident->points;

        return "Dear Parent, {$name} had a behaviour incident on {$date}: {$typeName} ({$points} pts). Please contact the school for details.";
    }
}
