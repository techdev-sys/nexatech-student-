<?php

namespace App\Jobs;

use App\Models\Communication;
use App\Services\ActivityLogger;
use App\Services\CommunicationDeliveryService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendCommunicationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int   $tries  = 3;
    public array $backoff = [60, 300, 900]; // 1min, 5min, 15min

    public function __construct(public Communication $communication) {}

    public function handle(CommunicationDeliveryService $deliveryService): void
    {
        $comm = $this->communication->fresh();

        if (!$comm || $comm->status === 'completed') {
            return;
        }

        Log::info('SendCommunicationJob: starting', [
            'communication_id' => $comm->id,
            'channel'          => $comm->channel,
            'recipients'       => $comm->total_recipients,
        ]);

        [$successful, $failed] = $deliveryService->processAll($comm);

        $status = $failed > 0 && $successful === 0 ? 'failed' : 'completed';

        $comm->update([
            'status'                => $status,
            'successful_deliveries' => $successful,
            'failed_deliveries'     => $failed,
        ]);

        ActivityLogger::logRaw('communication.sent', Communication::class, $comm->id, [
            'channel'     => $comm->channel,
            'audience'    => $comm->audience_type,
            'total'       => $comm->total_recipients,
            'successful'  => $successful,
            'failed'      => $failed,
        ]);

        Log::info('SendCommunicationJob: completed', [
            'communication_id' => $comm->id,
            'successful'       => $successful,
            'failed'           => $failed,
            'status'           => $status,
        ]);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('SendCommunicationJob: all retries exhausted', [
            'communication_id' => $this->communication->id,
            'error'            => $e->getMessage(),
        ]);

        $this->communication->update(['status' => 'failed']);

        ActivityLogger::logRaw('communication.job_failed', Communication::class, $this->communication->id, [
            'error' => $e->getMessage(),
        ]);
    }
}
